class ServerError extends Error {
  constructor(error = {}, description) {
    super();
    const message = description
      ? `${error.message || 'Something went wrong'} ${description}`
      : `${error.message || 'Something went wrong'}`;

    this.name = error.name || 'ServerError';
    this.code = error.code;
    this.status = error.status || 500;
    this.message = message;
    this.stack = error.stack;
  }
}

exports.ServerError = ServerError;
