const cookie = require('cookie');
const express = require('express');
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
const {client} = require('./db/client');
const { ServerError } = require('./utils/error');

client.connect().then(() => {
  logger.info('Connected to DB.');
}).catch((error) => {
  logger.error('Error while connect to DB.', error.message, error.reason);
});

if (dotenv.error) { throw dotenv.error }

const app = express();
const server = http.createServer(app);
const io = socketio(server, {
  origins: 'localhost:*',
  pingInterval: 900000,
  pingTimeout: 60000
}); // todo add logger -> winston to options

const db = require('./db/index').collections();
const chat = io.of('/chat');
const config = require('./config/config');
const socketEvents = require('./config/socketEvents');
const connectionStr = 'mongodb+srv://owner:zerogravity@mycluster-f7pss.mongodb.net/test?replicaSet=MyCluster-shard-0&authSource=admin&retryWrites=true&w=majority';
const sessionStore = new MongoStore({ url: connectionStr });
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
    next();
  } else if (!app.locals.username && req.body.username) {
    app.locals.username = req.body.username;
    next();
  } else if (!app.locals.username) {
    app.locals.username = null;
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
  const user = socket.handshake.user;

  communicate.setUser(user);
  communicate.setSocket(socket);
  socket.join(user.currentRoom);

  const usersInRoom = await db.users.findAllUsersInRoom(user.currentRoom);
  const messages = await db.chat.getMessages(user.currentRoom, user.userId);

  communicate.sendHistory(messages);
  communicate.sendWelcomeMsg();
  communicate.informUserConnected();
  communicate.sendUsersList(usersInRoom);

  socket.on(socketEvents.typeStart, () => { communicate.toggleUserIsTyping(true); });
  socket.on(socketEvents.typeEnd, () => { communicate.toAllTemp(socketEvents.typeEnd); });

  socket.on(socketEvents.sendMessage, (msg, cb) => {
    db.chat.addMessage(formatMessage(msg, user).peer())
      .then(() => communicate.sendMessage(msg))
      .then(() => cb(msg))
      .catch((error) => console.warn(error.message));
  });

  socket.on(socketEvents.sendInvite, (receivers) => {
    sendInvite({ from: user.username, to: receivers, link: socket.handshake.headers.origin })
      .then(() => communicate.sendInviteConfirmation())
      .catch(error => communicate.toSender(socketEvents.sendInviteResult, error.message));
  });

  socket.on(socketEvents.disconnect, async () => {
    logger.info(`User ${user.username} disconnected`);
    communicate.informUserDisconnected();
    const usersInRoom = await db.users.findAllUsersInRoom(user.currentRoom);
    communicate.sendUsersList(usersInRoom);

    app.locals.username = null;
  });
});

server.listen(process.env.PORT, () => {
  logger.info(`listening on port ${process.env.PORT}`);
});
