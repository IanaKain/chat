const bcrypt = require('bcrypt');
const db = require('../db/index').collections();
const config = require('../config/config');
const constants = require('../constants/index');
const {ServerError} = require('../utils/error');

class Sessions {
  constructor(methods = ['']) {
    methods.forEach((m) => { this[m] = this[m].bind(this); });
  }
  async findAndAuthorize(fromData) {
    const userFound = await db.users.findUser(fromData.username);

    if (userFound) {
      const isAuthorized = Boolean(await bcrypt.compare(fromData.password, userFound.password));

      if (isAuthorized) {
        return {...fromData, ...userFound};
      }
      throw new ServerError({message: constants.errors.wrongPassword});
    }
    throw new ServerError({message: constants.errors.userNotFound});
  }

  async show(req, res, next) {
    try {
      res.render(config.templates.login, constants.formProps);
    } catch (error) {
      next(new ServerError(error));
    }
  }

  async create(req, res, next) {
    try {
      const user = await this.findAndAuthorize(req.body);

      if (user.room !== req.body.room) {
        await db.users.addRoomToUser(user, req.body.room);
      }
      req.session.user = {...user, room: req.body.room};
      res.redirect(config.routes.chat);
    } catch (error) {
      const {wrongPassword, userNotFound} = constants.errors;

      if (error.message === wrongPassword) { // err handler?
        return res.render(config.templates.login, {...constants.formProps, user: null, error: wrongPassword});
      }
      if (error.message === userNotFound) { return res.redirect(config.routes.join); }
      next(new ServerError(error));
    }
  }

  async destroy(req, res, next) {
    if (req.session) {
      req.session.destroy((error) => {
        if (!error) {
          res.clearCookie('sid', {path: '/'});
        } else {
          next(new ServerError(error));
        }
      });
    }
    res.redirect(config.routes.login);
  }
}

const sessions = new Sessions(['findAndAuthorize', 'show', 'create', 'destroy']);

module.exports = sessions;
