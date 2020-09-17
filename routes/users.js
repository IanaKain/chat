const router = require('express-promise-router');
const users = require('../controllers/users');
const config = require('../config/config');

router.get(config.routes.main, users.show);
router.post(config.routes.main, users.create);

module.exports = router;