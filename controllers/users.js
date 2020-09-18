const bcrypt = require('bcrypt');
const db = require('../db/index').collections();
const config = require('../config/config');
const constants = require('../constants/index');
const {ServerError} = require('../utils/error');

class Users {
  constructor(methods = ['']) {
    methods.forEach((m) => { this[m] = this[m].bind(this); });
  }

  async show(req, res, next) {
    try {
      res.render(config.templates.login, {...constants.formProps, form: constants.formProps.joinPath});
    } catch (error) {
      next(new ServerError(error));
    }
  }

  async create(req, res, next) {
    try {
      const user = await db.users.findUser(req.body.username);

      if (user) {
        res.render(config.templates.login, {
          ...constants.formProps,
          user,
          form: constants.formProps.joinPath,
          error: constants.errors.userExists,
        });
      } else {
        const salt = await bcrypt.genSalt(10);
        const securePassword = await bcrypt.hash(req.body.password, salt);

        req.session.user = await db.users.addUser({...req.body, password: securePassword});
        res.redirect(config.routes.chat);
      }
    } catch (error) {
      next(new ServerError(error));
    }
  }
}

const users = new Users(['show', 'create']);

module.exports = users;
