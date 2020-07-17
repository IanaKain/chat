const winston = require('winston');

const getLogger = (module) => {
  const path = module.filename.split('/').slice(-2).join('/');
  const format = winston.format.printf(
    ({level, message, label, timestamp, ...rest}) =>
      `${level}: [${label}] | ${message} ${(rest[Symbol.for('splat')] || []).join(':')} | ${timestamp}`
  );

  return winston.createLogger({
    levels: winston.config.npm.levels,
    format: winston.format.combine(
      winston.format.colorize({all: true}),
      winston.format.label({label: path}),
      winston.format.timestamp(),
      format
    ),
    transports: [new winston.transports.Console()],
  });
};

module.exports = getLogger;
