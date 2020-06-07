const bcrypt = require('bcrypt');
const db = require('../db/index').collections();
const config = require('../config/config');

const formTitle = { title: 'Welcome to chatroom', user: null, error: null };
const errors = {
  wrongPassword: 'Error: Incorrect password.',
  userExists: 'Error: User already exists.',
};

const isUserAuthorized = async (user, password) => {
  console.log(user, password);
  const validPassword = await bcrypt.compare(password, user.password);
  return !!validPassword;
};

const securePassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  const userPwd = await bcrypt.hash(password, salt);

  return userPwd;
};

const goToChat = (req, res, user) => {
  if (!user && !req.session.user) {
    res.redirect(config.routes.login);
  }
  if (!req.session.user) {
    req.session.user = user;
    res.redirect(config.routes.chat);
  } else {
    res.redirect(config.routes.chat);
  }
};

exports.loginIndex = async (req, res) => {
  // await db.users.clearCollection();
  // await db.chat.clearCollection();
  req.session.user
    ? goToChat(req, res)
    : res.render(config.templates.login, formTitle);
};

exports.login = async (req, res) => {
  try {
    if (req.session.user) { return goToChat(req, res); }

    const userFound = await db.users.findUser(req.body.username);

    if (userFound) {
      await isUserAuthorized(userFound, req.body.password)
        ? goToChat(req, res, userFound)
        : res.render(config.templates.login, { ...formTitle, user: userFound, error: errors.wrongPassword });
    } else {
      res.redirect(config.routes.join);
    }
  } catch (error) {
    console.log('ERROR in path /login', error);
    res.status(500).end();
  }
};

exports.chatIndex = (req, res) => {
  req.session.user
    ? res.render(config.templates.chat)
    : res.redirect(config.routes.login);
};

exports.joinIndex = function(req, res){
  req.session.user
    ? goToChat(req, res)
    : res.render(config.templates.join, formTitle)
};

exports.join = async (req, res) => {
  try {
    if (req.session.user) { return goToChat(req, res); }

    const userFound = await db.users.findUser(req.body.username);

    if (userFound) {
      res.render(config.templates.join, { ...formTitle, user: userFound, error: errors.userExists })
    } else {
      const newUser = await db.users.addUser({ ...req.body, password: await securePassword(req.body.password) });

      goToChat(req, res, newUser); // todo default room or room the user last visited?
    }
  } catch (error) {
    console.log('ERROR in path /chat', error);
    res.status(500).end();
  }
};

exports.logout = (req, res, next) => {
  if (req.session) {
    req.session.destroy((error) => {
      if (!error) {
        res.clearCookie('sid', { path: '/' });
        res.redirect(config.routes.login);
      } else {
        next(error);
      }
    })
  }
};

exports.redirect = (req, res) => {
  res.redirect(config.routes.login);
};
