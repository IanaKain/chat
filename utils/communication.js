const config = require('../config/config');
const socketEvents = require('../config/socketEvents.json');
const formatMessage = require('./messages');

class ServerCommunication {
  constructor(app, io) {
    this.io = io;
    this.server = app;
    this.socket = null;
  }

  setSocket = (socket) => {
    this.socket = socket;
  };

  removeSocket = () => {
    this.socket = null;
  };

  isOwner = (socket) => socket.handshake.user.userId === this.socket.handshake.user.userId;

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

  sendPrivateMessage = (id, msg) => this.io.to(id).emit(socketEvents.renderPrivateMessage, msg).bind(this.io);

  sendWelcomeMsg = () => {
    const msg = formatMessage({text: 'Welcome to the Chat!'}).admin();

    this.server.render(config.templates.history, {messages: [msg]}, (err, html) => {
      this.toSender(socketEvents.renderAdminMessage, html);
    });
  };

  sendHistory = (history) => {
    this.server.render(config.templates.history, {messages: history}, (err, html) => {
      this.toSender(socketEvents.renderMessageHistory, html);
    });
  };

  informUserConnected = () => {
    const msg = formatMessage({text: `${this.socket.handshake.user.username} has joined the chat`}).admin();

    this.server.render(config.templates.history, {messages: [msg]}, (err, html) => {
      this.toAllInRoomExceptSender(socketEvents.renderAdminMessage, html);
    });
  };

  informUserDisconnected = () => {
    const msg = formatMessage({text: `${this.socket.handshake.user.username} has left the chat`}).admin();

    this.server.render(config.templates.history, {messages: [msg]}, (err, html) => {
      this.toAllInRoomExceptSender(socketEvents.renderAdminMessage, html);
    });
  };

  sendUsersList = () => {
    this.server.render(config.templates.users, {users: this.usersInCurrentRoom}, (err, html) => {
      this.toAllInRoom(socketEvents.renderUsers, html);
    });
  };

  toggleUserIsTyping = (isTyping, socket) => {
    if (isTyping) {
      this.server.render(config.templates.typing, {...socket.handshake.user}, (err, html) => {
        socket.to(socket.handshake.user.room).emit(socketEvents.typeStart, html);
      });
    } else {
      this.server.render(config.templates.typing, {...socket.handshake.user}, () => {
        socket.to(socket.handshake.user.room).emit(socketEvents.typeEnd);
      });
    }
  };

  sendMessage = (msg, socket) => {
    const isOwner = this.isOwner(socket);

    this.server.render(config.templates.history, {messages: [{...msg, role: isOwner ? 'peer' : 'owner'}]}, (err, html) => {
      this.toAllInRoomExceptSender(socketEvents.renderPeerMessage, html);
      // socket.to(socket.handshake.user.room).emit(socketEvents.renderPeerMessage, html);
    });
    this.server.render(config.templates.history, {messages: [{...msg, role: isOwner ? 'owner' : 'peer'}]}, (err, html) => {
      this.toSender(socketEvents.renderOwnerMessage, html);
      // socket.emit(socketEvents.renderOwnerMessage, html);
    });
  };

  sendUpdatedMessage = (msg, socket) => {
    const isOwner = this.isOwner(socket);

    this.server.render(config.templates.history, {messages: [{...msg, role: isOwner ? 'peer' : 'owner'}]}, (err, html) => {
      this.toAllInRoomExceptSender(socketEvents.editMessageSuccess, html);
    });

    this.server.render(config.templates.history, {messages: [{...msg, role: isOwner ? 'owner' : 'peer'}]}, (err, html) => {
      this.toSender(socketEvents.editMessageSuccess, html);
    });
  };
}

exports.createCommunication = (app, io) => () => new ServerCommunication(app, io);
