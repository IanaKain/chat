const moment = require('moment');

const ADMIN = 'admin';
const OWNER = 'owner';
const PEER = 'peer';

const adminMessage = (msg) => ({
  role: ADMIN,
  userId: ADMIN,
  username: ADMIN,
  text: msg,
  time: moment().calendar(),
});

const peerMessage = (msg, user) => ({
  role: PEER,
  userId: user._id,
  username: user.username,
  room: user.currentRoom,
  text: msg,
  time: moment().calendar(),
});

const formatMessage = (msg, user) => ({
  admin: () => adminMessage(msg),
  peer: () => peerMessage(msg, user),
});

const messageToClient = () => {

};

module.exports = formatMessage;
