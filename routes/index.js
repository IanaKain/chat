const bcrypt = require('bcrypt');
const db = require('../db/index').collections();
const config = require('../config/config');
const { ServerError } = require('../utils/error');

const formTitle = { title: 'Welcome to chatroom', user: null, error: null };
const errors = {
  wrongPassword: 'Error: Incorrect password.',
  userExists: 'Error: User already exists.',
  userNotFound: 'Error: User already exists.',
  serverError: 'Error: Something went wrong.',
};

const isUserAuthorized = async (user, password) => {
  const validPassword = await bcrypt.compare(password, user.password);
  return !!validPassword;
};

const securePassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  const userPwd = await bcrypt.hash(password, salt);

  return userPwd;
};

const findAndAuthorize = async (fromData) => {
  const userFound = await db.users.findUser(fromData.username);

  if (userFound) {
    const isAuthorized = await isUserAuthorized(userFound, fromData.password);
    if (isAuthorized) {
      return { ...fromData, ...userFound };
    } else {
      throw new ServerError({ message: errors.wrongPassword });
    }
  }
  throw new ServerError({ message: errors.userNotFound });
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

exports.loginIndex = async (req, res, next) => {
  try {
    // await db.users.clearCollection();
    // await db.chat.clearCollection();
    req.session.user
      ? goToChat(req, res)
      : res.render(config.templates.login, formTitle);
  } catch (error) {
    next(new ServerError(error));
  }
};

exports.login = async (req, res, next) => {
  try {
    if (req.session.user) { return goToChat(req, res); }
    const userFound = await findAndAuthorize(req.body);

    if (userFound) {
      if (!userFound.currentRoom || userFound.currentRoom !== req.body.currentRoom) {
        await db.users.addRoomToUser(userFound, req.body.currentRoom);
        goToChat(req, res, { ...userFound, currentRoom: req.body.currentRoom });
      } else {
        goToChat(req, res, userFound);
      }
    }
  } catch (error) {
    if (error.message === errors.wrongPassword) {
      return res.render(config.templates.login, { ...formTitle, user: null, error: errors.wrongPassword });
    }
    if (error.message === errors.userNotFound) {
      return res.redirect(config.routes.join);
    }
    next(new ServerError(error));
  }
};

exports.chatIndex = (req, res, next) => {
  try {
    req.session.user
      ? res.render(config.templates.chat)
      : res.redirect(config.routes.login);
  } catch (error) {
    next(new ServerError(error));
  }
};

exports.joinIndex = (req, res, next) => {
  try {
    req.session.user
      ? goToChat(req, res)
      : res.render(config.templates.join, formTitle)
  } catch (error) {
    next(new ServerError(error));
  }
};

exports.join = async (req, res, next) => {
  try {
    if (req.session.user) { return goToChat(req, res); }

    const userFound = await db.users.findUser(req.body.username);

    if (userFound) {
      res.render(config.templates.join, { ...formTitle, user: userFound, error: errors.userExists })
    } else {
      const userToAdd = { ...req.body, password: await securePassword(req.body.password) };
      const newUser = await db.users.addUser(userToAdd);

      goToChat(req, res, newUser);
    }
  } catch (error) {
    next(new ServerError(error));
  }
};

exports.logout = async (req, res, next) => {
  try {
    const isCurrentRoomRemoved = await db.users.removeRoomFromUser(req.session.user);
    console.log(2, isCurrentRoomRemoved.value);
    if (req.session) {
      req.session.destroy((error) => {
        if (!error) {
          res.clearCookie('sid', { path: '/' });
          res.redirect(config.routes.login);
        } else {
          next(new ServerError(error));
        }
      })
    }
  } catch (error) {
    next(new ServerError(error));
  }
};

exports.redirect = (req, res) => {
  res.redirect(config.routes.login);
};
