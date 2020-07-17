const bcrypt = require('bcrypt');
const db = require('../db/index').collections();
const config = require('../config/config');
const {ServerError} = require('../utils/error');
const constants = require('../constants/index');

const isUserAuthorized = async (user, password) => {
  const validPassword = await bcrypt.compare(password, user.password);

  return !!validPassword;
};

const securePassword = async (password) => {
  const salt = await bcrypt.genSalt(10);

  return bcrypt.hash(password, salt);
};

const findAndAuthorize = async (fromData) => {
  const userFound = await db.users.findUser(fromData.username);

  if (userFound) {
    const isAuthorized = await isUserAuthorized(userFound, fromData.password);

    if (isAuthorized) {
      return {...fromData, ...userFound};
    }
    throw new ServerError({message: constants.errors.wrongPassword});
  }
  throw new ServerError({message: constants.errors.userNotFound});
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
    req.session.user
      ? goToChat(req, res)
      : res.render(config.templates.login, constants.formProps);
  } catch (error) {
    next(new ServerError(error));
  }
};

exports.login = async (req, res, next) => {
  try {
    if (req.session.user) { return goToChat(req, res); }
    const userFound = await findAndAuthorize(req.body);

    if (userFound) {
      if (!userFound.room || userFound.room !== req.body.room) {
        await db.users.addRoomToUser(userFound, req.body.room);
        goToChat(req, res, {...userFound, room: req.body.room});
      } else {
        goToChat(req, res, userFound);
      }
    }
  } catch (error) {
    if (error.message === constants.errors.wrongPassword) {
      return res.render(config.templates.login, {...constants.formProps, user: null, error: constants.errors.wrongPassword});
    }
    if (error.message === constants.errors.userNotFound) {
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
      : res.render(config.templates.login, {...constants.formProps, form: constants.formProps.joinPath});
  } catch (error) {
    next(new ServerError(error));
  }
};

exports.join = async (req, res, next) => {
  try {
    if (req.session.user) { return goToChat(req, res); }

    const userFound = await db.users.findUser(req.body.username);

    if (userFound) {
      res.render(
        config.templates.login,
        {
          ...constants.formProps,
          form: constants.formProps.joinPath,
          user: userFound,
          error: constants.errors.userExists,
        }
      );
    } else {
      const newUser = await db.users.addUser({
        ...req.body,
        password: await securePassword(req.body.password),
      });

      goToChat(req, res, newUser);
    }
  } catch (error) {
    next(new ServerError(error));
  }
};

exports.logout = async (req, res, next) => {
  try {
    if (req.session) {
      req.session.destroy((error) => {
        if (!error) {
          res.clearCookie('sid', {path: '/'});
          res.redirect(config.routes.login);
        } else {
          next(new ServerError(error));
        }
      });
    }
  } catch (error) {
    next(new ServerError(error));
  }
};

exports.redirect = (req, res) => {
  res.redirect(config.routes.login);
};
