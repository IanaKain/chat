const cookie = require('cookie');
const express = require('express');
const base64Img = require('base64-img');
const errorhandler = require('errorhandler');
const path = require('path');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const logger = require('./utils/logger')(module);
const http = require('http');
const socketio = require('socket.io');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const routes = require('./routes');
const dotenv = require('dotenv').config();
if (dotenv.error) { throw dotenv.error }

const {client} = require('./db/client');
const { ServerError } = require('./utils/error');
const config = require('./config/config');

client.connect().then(() => {
  logger.info('Connected to DB.');
}).catch((error) => {
  logger.error('Error while connect to DB.', error.message, error.reason);
});

const app = express();
const server = http.createServer(app);
const io = socketio(server, config.socket); // todo add logger -> winston to options

const db = require('./db/index').collections();
const chat = io.of('/chat');
const socketEvents = require('./config/socketEvents.json');
const sessionStore = new MongoStore({ url: config.db.connectionStr });
const communicator = require('./utils/communication').createCommunication(app, chat);
const communicate = communicator();
const formatMessage = require('./utils/messages');
const sendInvite = require('./utils/mail');

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(morgan(app.get('env') === 'development' ? 'dev' : 'default'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.json({ type: ['application/json', 'text/plain'] }));
app.use(require('stylus').middleware(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

// goes after cookieParser, when cookies are read and ready
app.use(session({
  key: config.session.key,
  secret: config.session.secret,
  resave: false,
  saveUninitialized: false,
  cookie: config.session.cookie,
  store: sessionStore,
}));

app.use((req, res, next) => {
  if (req.session && req.session.user) {
    app.locals.username = req.session.user.username;
    app.locals.room = req.session.user.room;
    next();
  } else if (!app.locals.username && req.body.username) {
    app.locals.username = req.body.username;
    app.locals.room = req.body.room;
    next();
  } else if (!app.locals.username) {
    app.locals.username = null;
    app.locals.room = null;
    next();
  } else {
    next();
  }
});

app.get(config.routes.main, routes.redirect);

app.get(config.routes.join, routes.joinIndex);
app.post(config.routes.join, routes.join);

app.get(config.routes.login, routes.loginIndex);
app.post(config.routes.login, routes.login);

app.get(config.routes.chat, routes.chatIndex);
app.get(config.routes.logout, routes.logout);

app.use((req, res) => {
  res.status(404).send('Sorry, page not found');
});

app.use((err, req, res, next) => {
  if (app.get('env') === 'development') {
    const errorHandler = errorhandler();
    errorHandler(err, req, res, next);
  } else {
    res.status(500).end();
  }
});

chat.use(function(socket, next) {
  const handshakeData = socket.request;
  const handshakeCookie = cookie.parse(handshakeData.headers.cookie || '');
  const sidCookie = cookieParser.signedCookie(handshakeCookie[config.session.key], config.session.secret);

  sessionStore.load(sidCookie, (error, session) => {
    if (error) { next(new ServerError(error, 'User is not authorized.')); }
    if (!session || !session.user) {
      next(new ServerError(error, 'User is not authorized.'));
    } else {
      socket.handshake.user = session.user;
      next();
    }
  });
});

chat.on(socketEvents.connection, async (socket) => {
  const { user } = socket.handshake;

  communicate.setSocket(socket);
  socket.join(user.room);

  try {
    const messages = await db.chat.getRoomMessages(user.room, user.userId);
    communicate.sendHistory(messages);
    communicate.sendWelcomeMsg();
    communicate.informUserConnected();
    communicate.sendUsersList();

    socket.on(socketEvents.typeStart, () => { communicate.toggleUserIsTyping(true, socket); });
    socket.on(socketEvents.typeEnd, () => { communicate.toggleUserIsTyping(false, socket); });

    socket.on(socketEvents.sendMessage, (msg) => {
      db.chat.addMessage(formatMessage(msg, user).peer())
        .then((message) => communicate.sendMessage(message, socket))
        .catch((error) => console.warn(error.message));
    });

    socket.on(socketEvents.sendInvite, (receivers, cb) => {
      sendInvite({ from: user.username, to: receivers, link: socket.handshake.headers.origin })
        .then(cb)
        .catch(error => communicate.toSender(socketEvents.sendInviteResult, error.message));
    });

    socket.on(socketEvents.uploadFile, async (file) => {
      base64Img.img(file, './public/images', Date.now(), (err, filePath) => {
        const arrPath = filePath.split('/');
        const fileName = arrPath[arrPath.length - 1];
        const src = `../images/${fileName}`;

        db.chat.addMessage(formatMessage('', user, src).peer())
          .then((message) => communicate.sendMessage(message, socket))
          .catch((error) => console.warn(error.message));
      });
    });

    socket.on(socketEvents.editMessage, async (messageId, message) => {
      db.chat.editMessage(messageId, message)
        .then((newMessage) => { communicate.sendUpdatedMessage(newMessage, socket) })
        .catch((error) => console.warn(error.message));
    });

    socket.on(socketEvents.deleteMessage, async (messageId) => {
        db.chat.deleteMessage(messageId)
          .then(() => socket.emit(socketEvents.deleteMessageSuccess, messageId))
          .catch((error) => console.warn(error.message));
    });

    socket.on(socketEvents.disconnect, async (data) => {
      logger.info(`User ${user.username} disconnected ${data}`);
      communicate.sendUsersList();
      communicate.informUserDisconnected();

      app.locals.username = null;
      app.locals.room = null;
    });
  } catch (e) {
    throw Error(e);
  }
});

server.listen(process.env.PORT, () => {
  logger.info(`listening on port ${process.env.PORT}`);
});
