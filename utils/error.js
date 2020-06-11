class ServerError extends Error {
  constructor(error = {}, description) {
    super();
    this.name = error.name || 'ServerError';
    this.code = error.code;
    this.status = error.status || 500;
    this.message = `${error.message || 'Something went wrong'}. ${description}`;
    this.stack = error.stack;
  }
}

exports.ServerError = ServerError;
