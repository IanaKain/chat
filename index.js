const bcrypt = require('bcrypt');
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
if (dotenv.error) { throw dotenv.error }

const app = express();
const server = http.createServer(app);
const io = socketio(server, {
  origins: 'localhost:*',
  pingInterval: 900000,
  pingTimeout: 60000
}); // todo add logger -> winston to options

const chat = io.of('/chat');
const config = require('./config/config');
const connectionStr = 'mongodb+srv://owner:zerogravity@mycluster-f7pss.mongodb.net/test?replicaSet=MyCluster-shard-0&authSource=admin&retryWrites=true&w=majority';
const sessionStore = new MongoStore({ url: connectionStr });

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

app.get('/', routes.index, async (req, res) => {
  req.session.user
    ? res.redirect(307, 'chat') // TODO res.locals.user
    : res.render('index', { title: 'Welcome to the Node Chatroom', error: null });
});

app.post('/', async (req, res) => {
  try {
    const userFound = null; // todo find user in db
    if (userFound) {
      const validPassword = await bcrypt.compare(req.body.password, 'userFound.password');
      if (validPassword) {
        req.session.user = userFound;
        res.redirect(307, 'chat');
      } else {
        res.render('index', { title: 'Welcome to the Node Chatroom', user: userFound, error: 'Error: Incorrect password.' })
      }
    }
    res.redirect(307, 'chat');
  } catch (error) {
    console.log('ERROR in path /chat', error);
    res.status(500).end();
  }
});

app.get('/chat', async (req, res) => {
  req.session.user
    ? res.render('chat', { ...req.session.user, users: [], messages: [] })
    : res.redirect(307, '/');
});

app.post('/chat', async (req, res) => {
  if (req.session.user) {
    res.render('chat', { ...req.session.user, users: [], messages: [] })
  }

  const reqValues = Object.values(req.body);
  const reqValuesEmpty = !reqValues.length || reqValues.some(v => !v);

  if (!reqValuesEmpty) {
    const salt = await bcrypt.genSalt(10);
    const userPwd = await bcrypt.hash(req.body.password, salt);
    const newUser =  { ...req.body, password: userPwd }; // todo add user to db

    req.session.user = newUser;
    res.render('chat', { ...newUser, users: [], messages: [] });
  } else {
    res.redirect('/');
  }
});

app.use((req, res) => {
  res.status(404).send('Sorry, page not found');
});

app.use((err, req, res, next) => {
  if (app.get('env') === 'development') {
    const errorHandler = errorhandler();
    errorHandler(err, req, res, next);
  } else {
    res.status(500);
  }
});

chat.use(function(socket, next) {
  const handshakeData = socket.request;
  const handshakeCookie = cookie.parse(handshakeData.headers.cookie || '');
  const sidCookie = cookieParser.signedCookie(handshakeCookie[config.session.key], config.session.secret);

  sessionStore.load(sidCookie, (err, session) => {
    if (err) { next(new Error('not authorized')); }
    if (!session || !session.user) { next(new Error('not authorized')); }

    socket.handshake.user = session.user;
    next();
  });
});

chat.on('connection', async (socket) => {
  const user = socket.handshake.user;
  socket.join(user.room);

  socket.on('disconnect', async () => {
    console.log('disconnect', socket.id, user.id);
  });
});

server.listen(process.env.PORT, () => {
  logger.info(`listening on port ${process.env.PORT}`);
});
