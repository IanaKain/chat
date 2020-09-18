const config = require('../config/config');
const {ServerError} = require('../utils/error');

class Chat {
  constructor(methods = ['']) {
    methods.forEach((m) => { this[m] = this[m].bind(this); });
  }

  async show(req, res, next) {
    try {
      res.render(config.templates.chat);
    } catch (error) {
      next(new ServerError(error));
    }
  }
}

const chat = new Chat(['show']);

module.exports = chat;
