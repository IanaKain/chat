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
    return socket.handshake.user.userId === this.socket.handshake.user.userId;
  }

  get toAll() {
    return this.io.emit;
  }

  get toAllExceptSender() {
    return this.socket.broadcast.emit.bind(this.socket);
  }

  get toOwner() {
    return this.socket.emit.bind(this.socket);
  }

  toSender(socket) {
    return socket.emit.bind(socket);
  }

  get toAllInRoom() {
    return this.io.in(this.socket.handshake.user.room).emit.bind(this.io);
  }

  toAllInRoomExceptSender(socket) {
    return socket.to(socket.handshake.user.room).emit.bind(socket);
  }

  get usersInCurrentRoom() {
    const users = Object.values(this.io.connected)
      .reduce((acc, client) => client.handshake.user.room === this.socket.handshake.user.room
        ? [...acc, {username: client.handshake.user.username, status: client.handshake.user.status}]
        : acc, []);

    console.log('users', users);
    // return [...new Set(users)];
    return users;
  }

  sendPrivateMessage(socket, event, ...rest) {
    this.io.to(socket.id).emit(event, ...rest);
  }

  sendWelcomeMsg(socket) {
    if (this.isOwner(socket)) {
      const msg = format.formatAdminMessage({text: 'Welcome to the Chat!'});

      this.server.render(config.templates.history, {messages: [msg]}, (err, html) => {
        this.toOwner(socketEvents.renderMessage, html);
      });
    }
  }

  sendHistory(history) {
    history.forEach((item) => {
      const {date, data} = item;

      this.server.render(config.templates.history, {messages: data, date}, (err, html) => {
        this.toOwner(socketEvents.renderMessageHistory, html);
      });
    });
  }

  informUserConnected(socket) {
    const msg = format.formatAdminMessage({text: `${socket.handshake.user.username} has joined the chat`});

    this.server.render(config.templates.history, {messages: [msg]}, (err, html) => {
      this.toAllInRoomExceptSender(socket)(socketEvents.renderMessage, html);
    });
  }

  informUserDisconnected(socket) {
    const msg = format.formatAdminMessage({text: `${socket.handshake.user.username} has left the chat`});

    this.server.render(config.templates.history, {messages: [msg]}, (err, html) => {
      this.toAllInRoomExceptSender(socket)(socketEvents.renderMessage, html);
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

  removeMessage(messageId) {
    this.toAllInRoom(socketEvents.deleteMessageSuccess, messageId);
  }

  reactOnMessage(msg) {
    this.server.render(config.templates.body, {item: msg}, (err, html) => {
      this.toAllInRoom(socketEvents.reactOnMessageSuccess, html, msg._id);
    });
  }

  sendMessage(msg, socket, {add, update}) {
    if (add) {
      this.server.render(config.templates.history, {messages: [{...msg, role: 'peer'}]}, (err, html) => {
        this.toAllInRoomExceptSender(socket)(socketEvents.renderMessage, html);
      });
      this.server.render(config.templates.history, {messages: [{...msg, role: 'owner'}]}, (err, html) => {
        this.toSender(socket)(socketEvents.renderMessage, html);
      });

      return;
    }

    if (update) {
      this.server.render(config.templates.update, {item: msg}, (err, html) => {
        this.toAllInRoom(socketEvents.editMessageSuccess, html, msg._id);
      });
    }
  }
}

exports.createCommunication = (app, io) => () => new ServerCommunication(app, io);
