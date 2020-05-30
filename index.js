const express = require('express');
const errorhandler = require('errorhandler');
const path = require('path');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const logger = require('./utils/logger')(module);
const http = require('http');
const routes = require('./routes');
const dotenv = require('dotenv').config();
if (dotenv.error) { throw dotenv.error }

const app = express();
const server = http.createServer(app);

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(morgan(app.get('env') === 'development' ? 'dev' : 'default'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.json({ type: ['application/json', 'text/plain'] }));
app.use(require('stylus').middleware(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', routes.index);

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

server.listen(process.env.PORT, () => {
  logger.info(`listening on port ${process.env.PORT}`);
});
