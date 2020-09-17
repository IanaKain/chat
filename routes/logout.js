const router = require('express-promise-router')();
const session = require('../controllers/session');
const config = require('../config/config');

router.get(config.routes.main, session.destroy);

module.exports = router;
