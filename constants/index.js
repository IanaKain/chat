const config = require('../config/config');

exports.errors = {
  wrongPassword: 'Error: Incorrect password.',
  userExists: 'Error: User already exists.',
  userNotFound: 'Error: User already exists.',
  serverError: 'Error: Something went wrong.',
};

exports.formProps = {
  form: config.routes.login,
  loginPath: config.routes.login,
  joinPath: config.routes.join,
  user: null,
  error: null
};
