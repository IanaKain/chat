const moment = require('moment');

const ADMIN = 'admin';
const OWNER = 'owner';
const PEER = 'peer';

const adminMessage = (msg) => ({
  role: ADMIN,
  userId: ADMIN,
  username: ADMIN,
  text: msg,
  createTime: moment().calendar(Date.now()),
  updateTime: null,
});

const peerMessage = (msg, user, src) => ({
  role: PEER,
  userId: user.userId,
  username: user.username,
  room: user.room,
  text: msg,
  imgSrc: src,
  createTime: moment().calendar(Date.now()),
  updateTime: null,
});

const ownerMessage = (msg, user, src) => ({
  role: OWNER,
  userId: user.userId,
  username: user.username,
  room: user.room,
  text: msg,
  imgSrc: src,
  createTime: moment().calendar(Date.now()),
  updateTime: null,
});

const formatMessage = (msg, user, src) => ({
  admin: () => adminMessage(msg),
  peer: () => peerMessage(msg, user, src),
  owner: () => ownerMessage(msg, user, src),
});

module.exports = formatMessage;
