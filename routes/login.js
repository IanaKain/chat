const router = require('express-promise-router')();
const session = require('../controllers/session');
const config = require('../config/config');

router.get(config.routes.main, session.show);
router.post(config.routes.main, session.create);

module.exports = router;
