const Users = require('./users');
const Chat = require('./chat');

exports.collections = () => ({
  users: new Users(),
  chat: new Chat(),
});
