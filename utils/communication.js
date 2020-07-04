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

  get toAll() {
    return this.io.emit;
  }

  get toAllExceptSender() {
    return this.socket.broadcast.emit.bind(this.socket);
  };

  get toSender() {
    return this.socket.emit.bind(this.socket);
  };

  get toAllInRoom() {
    return this.io.in(this.socket.handshake.user.room).emit.bind(this.io);
  };

  get toAllInRoomExceptSender() {
    return this.socket.to(this.socket.handshake.user.room).emit.bind(this.socket);
  };

  get usersInCurrentRoom() {
    const users = Object.values(this.io.connected).reduce((acc, client) => {
      return client.handshake.user.room === this.socket.handshake.user.room
        ? [...acc, client.handshake.user.username]
        : acc;
    }, []);

    return [...new Set(users)];
  }

  sendPrivateMessage = (id, msg) => this.io.to(id).emit(socketEvents.renderPrivateMessage, msg).bind(this.io);

  sendWelcomeMsg = () => {
    this.server.render(config.templates.message, formatMessage( 'Welcome to the Chat!').admin(), (err, html) => {
      this.toSender(socketEvents.renderAdminMessage, html);
    });
  };

  sendHistory = (history) => {
    this.server.render(config.templates.history, { messages: history }, (err, html) => {
      this.toSender(socketEvents.renderMessageHistory, html);
    });
  };

  informUserConnected = () => {
    const isUnique = Boolean(!this.usersInCurrentRoom.includes(this.socket.handshake.user.username));

    if (isUnique) {
      this.server.render(config.templates.message, formatMessage( `${this.socket.handshake.user.username} has joined the chat`).admin(), (err, html) => {
        this.toAllInRoomExceptSender(socketEvents.renderAdminMessage, html);
      });
    }
  };

  informUserDisconnected = () => {
    const isUnique = Boolean(!this.usersInCurrentRoom.includes(this.socket.handshake.user.username));

    if (isUnique) {
      this.server.render(config.templates.message, formatMessage( `${this.socket.handshake.user.username} has left the chat`).admin(), (err, html) => {
        this.toAllInRoomExceptSender(socketEvents.renderAdminMessage, html);
      });
    }
  };

  sendUsersList = () => {
    this.server.render(config.templates.users, { users: this.usersInCurrentRoom }, (err, html) => {
      this.toAllInRoom(socketEvents.renderUsers, html);
    });
  };

  toggleUserIsTyping = (isTyping, socket) => {
    if (isTyping) {
      this.server.render(config.templates.typing, { ...socket.handshake.user }, (err, html) => {
        socket.to(socket.handshake.user.room).emit(socketEvents.typeStart, html);
      });
    } else {
      this.server.render(config.templates.typing, { ...socket.handshake.user }, () => {
        socket.to(socket.handshake.user.room).emit(socketEvents.typeEnd);
      });
    }
  };

  sendMessage = (msg, socket) => {
    const isOwner = socket.handshake.user.userId === this.socket.handshake.user.userId;
    const message = isOwner
      ? formatMessage(msg, socket.handshake.user).owner()
      : formatMessage(msg, socket.handshake.user).peer();

    this.server.render(config.templates.message, message, (err, html) => {
      if (isOwner) {
        this.toAllInRoomExceptSender(socketEvents.renderPeerMessage, html);
        this.toSender(socketEvents.renderOwnerMessage, html);
      } else {
        socket.to(socket.handshake.user.room).emit(socketEvents.renderPeerMessage, html);
        socket.emit(socketEvents.renderOwnerMessage, html);
      }
    });
  };
}

exports.createCommunication = (app, io) => () => new ServerCommunication(app, io);
