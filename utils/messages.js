const moment = require('moment');

const ADMIN = 'admin';

const userMessage = (user) => ({
  userId: user.userId,
  username: user.username,
  room: user.room,
  role: null,
  text: null,
  imgSrc: null,
  updateTime: null,
});

exports.formatAdminMessage = (msg) => ({
  ...msg,
  role: ADMIN,
  userId: ADMIN,
  username: ADMIN,
  createTime: moment().toISOString(),
  updateTime: null,
});

exports.formatUserMessage = (msg, user) => ({
  ...userMessage(user),
  ...msg,
});
