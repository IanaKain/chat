const moment = require('moment');

const ADMIN = 'admin';
const OWNER = 'owner';
const PEER = 'peer';

const userMessage = (user) => ({
  userId: user.userId,
  username: user.username,
  room: user.room,
  role: null,
  text: null,
  imgSrc: null,
  createTime: moment(Date.now()).format('HH:mm'),
  updateTime: null,
});

const adminMessage = (msg) => ({
  ...msg,
  role: ADMIN,
  userId: ADMIN,
  username: ADMIN,
  createTime: moment(Date.now()).format('HH:mm'),
  updateTime: null,
});

const peerMessage = (msg, user) => ({
  ...userMessage(user),
  ...msg,
  role: PEER,
});

const ownerMessage = (msg, user) => ({
  ...userMessage(user),
  ...msg,
  role: OWNER,
});

const formatMessage = (msg, user) => ({
  admin: () => adminMessage(msg),
  peer: () => peerMessage(msg, user),
  owner: () => ownerMessage(msg, user),
});

module.exports = formatMessage;
