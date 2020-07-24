const config = require('../config/config');
const socketEvents = require('../config/socketEvents.json');
const format = require('./messages');

class ServerCommunication {
  constructor(app, io) {
    this.io = io;
    this.server = app;
    this.socket = null;
  }

  setSocket(socket) {
    this.socket = socket;
  }

  removeSocket() {
    this.socket = null;
  }

  isOwner(socket) {
    return socket.handshake.user.userId === this.socket.handshake.user.userId
  }

  get toAll() {
    return this.io.emit;
  }

  get toAllExceptSender() {
    return this.socket.broadcast.emit.bind(this.socket);
  }

  get toSender() {
    return this.socket.emit.bind(this.socket);
  }

  get toAllInRoom() {
    return this.io.in(this.socket.handshake.user.room).emit.bind(this.io);
  }

  get toAllInRoomExceptSender() {
    return this.socket.to(this.socket.handshake.user.room).emit.bind(this.socket);
  }

  get usersInCurrentRoom() {
    const users = Object.values(this.io.connected)
      .reduce((acc, client) => client.handshake.user.room === this.socket.handshake.user.room
        ? [...acc, client.handshake.user.username]
        : acc, []);

    return [...new Set(users)];
  }

  sendPrivateMessage(id, msg) {
    return this.io.to(id).emit(socketEvents.renderPrivateMessage, msg).bind(this.io);
  }

  sendWelcomeMsg() {
    const msg = format.formatAdminMessage({text: 'Welcome to the Chat!'});

    this.server.render(config.templates.history, {messages: [msg]}, (err, html) => {
      this.toSender(socketEvents.renderAdminMessage, html);
    });
  }

  sendHistory(history) {
    history.forEach((item) => {
      const {date, data} = item;

      this.server.render(config.templates.history, {messages: data, date}, (err, html) => {
        this.toSender(socketEvents.renderMessageHistory, html);
      });
    });
  }

  informUserConnected() {
    const msg = format.formatAdminMessage({text: `${this.socket.handshake.user.username} has joined the chat`});

    this.server.render(config.templates.history, {messages: [msg]}, (err, html) => {
      this.toAllInRoomExceptSender(socketEvents.renderAdminMessage, html);
    });
  }

  informUserDisconnected() {
    const msg = format.formatAdminMessage({text: `${this.socket.handshake.user.username} has left the chat`});

    this.server.render(config.templates.history, {messages: [msg]}, (err, html) => {
      this.toAllInRoomExceptSender(socketEvents.renderAdminMessage, html);
    });
  }

  sendUsersList() {
    this.server.render(config.templates.users, {users: this.usersInCurrentRoom}, (err, html) => {
      this.toAllInRoom(socketEvents.renderUsers, html);
    });
  }

  toggleUserIsTyping(isTyping, socket) {
    if (isTyping) {
      this.server.render(config.templates.typing, {...socket.handshake.user}, (err, html) => {
        socket.to(socket.handshake.user.room).emit(socketEvents.typeStart, html);
      });
    } else {
      this.server.render(config.templates.typing, {...socket.handshake.user}, () => {
        socket.to(socket.handshake.user.room).emit(socketEvents.typeEnd);
      });
    }
  }

  sendMessage(msg, socket, {add, update, remove}) {
    const isOwner = this.isOwner(socket);
    const event = (add && socketEvents.renderMessage)
      || (update && socketEvents.editMessageSuccess);

    if (remove) {
      this.toSender(socketEvents.deleteMessageSuccess, msg);
      this.toAllInRoomExceptSender(socketEvents.deleteMessageSuccess, msg);
    }

    this.server.render(config.templates.history, {messages: [{...msg, role: isOwner ? 'peer' : 'owner'}]}, (err, html) => {
      this.toAllInRoomExceptSender(event, html);
    });
    this.server.render(config.templates.history, {messages: [{...msg, role: isOwner ? 'owner' : 'peer'}]}, (err, html) => {
      this.toSender(event, html);
    });
  }
}

exports.createCommunication = (app, io) => () => new ServerCommunication(app, io);
