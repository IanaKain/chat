const router = require('express-promise-router')();
const chat = require('../controllers/chat');
const config = require('../config/config');

router.get(config.routes.main, chat.show);

module.exports = router;
