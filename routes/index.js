const router = require('express-promise-router')();
const config = require('../config/config');
const login = require('./login');
const logout = require('./logout');
const users = require('./users');
const chat = require('./chat');

router.get(config.routes.main, (req, res) => {
  res.redirect(config.routes.login);
});
router.use(config.routes.login, login);
router.use(config.routes.logout, logout);
router.use(config.routes.join, users);
router.use(config.routes.chat, chat);

module.exports = router;
