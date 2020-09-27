const express = require('express');
const errorhandler = require('errorhandler');
const path = require('path');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const http = require('http');
const socketio = require('socket.io');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const dotenv = require('dotenv').config();
const routes = require('./routes');
const logger = require('./utils/logger')(module);
const db = require('./db/index').collections();

if (dotenv.error) { throw dotenv.error; }

const {client} = require('./db/client');
const config = require('./config/config');

client.connect().then(() => {
  logger.info('Connected to DB.');
}).catch((error) => {
  logger.error('Error while connect to DB.', error.message, error.reason);
});

const app = express();
const server = http.createServer(app);
const io = socketio(server, config.socket); // todo add logger -> winston to options
const sessionStore = new MongoStore({url: config.db.connectionStr});

const chatImplementation = require('./socket');

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(morgan(app.get('env') === 'development' ? 'dev' : 'default'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());
app.use(express.json({type: ['application/json', 'text/plain']}));
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

app.use(async (req, res, next) => {
  const userName = req.session && req.session.user
    ? req.session.user.username
    : req.body.username;

  const user = await db.users.findUser(userName);

  if (user) {
    app.locals.username = user.username;
    app.locals.avatar = user.avatar;
    app.locals.room = user.room;
    next();

    return;
  }

  if (req.session && req.session.user) {
    app.locals.username = req.session.user.username;
    app.locals.avatar = req.session.user.avatar;
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

app.use((req, res, next) => {
  switch (req.url) {
    case config.routes.login:
    case config.routes.join:
      req.session.user
        ? res.redirect(config.routes.chat)
        : next();
      break;
    case config.routes.logout:
    case config.routes.chat:
      req.session.user
        ? next()
        : res.redirect(config.routes.login);
      break;
    default:
      next();
  }
});
app.use(routes);
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

chatImplementation(app, sessionStore, io);

server.listen(process.env.PORT, () => {
  logger.info(`listening on port ${process.env.PORT}`);
});
