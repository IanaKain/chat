const config = require('../config/config');

exports.goToChat = (req, res, user) => {
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
