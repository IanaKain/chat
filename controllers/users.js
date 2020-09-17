const bcrypt = require('bcrypt');
const Base = require('./index');
const db = require('../db/index').collections();
const routing = require('../utils/routing');
const config = require('../config/config');
const constants = require('../constants/index');
const {ServerError} = require('../utils/error');

class Users extends Base {
  async show(req, res, next) {
    try {
      req.session.user
        ? routing.goToChat(req, res)
        : res.render(config.templates.login, {...constants.formProps, form: constants.formProps.joinPath});
    } catch (error) {
      next(new ServerError(error));
    }
  }

  async create(req, res, next) {
    try {
      if (req.session.user) {
        return routing.goToChat(req, res);
      }

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
        const salt = await bcrypt.genSalt(10);
        const securePassword = bcrypt.hash(req.body.password, salt);
        const newUser = await db.users.addUser({...req.body, password: securePassword});

        routing.goToChat(req, res, newUser);
      }
    } catch (error) {
      next(new ServerError(error));
    }
  }
}

module.exports = new Users();
