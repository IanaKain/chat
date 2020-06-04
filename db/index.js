const Users = require('./users');
const Rooms = require('./rooms');
const Chat = require('./chat');

exports.collections = () => ({
  users: new Users(),
  rooms: new Rooms(),
  chat: new Chat(),
});
