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

  get toSender() {
    return this.socket.emit.bind(this.socket);
  };

  get toAllExceptSender() {
    return this.socket.broadcast.emit.bind(this.socket);
  };

  get toAllInRoom() {
    return this.io.in(this.socket.handshake.user.room).emit.bind(this.io);
  };

  get toAllInRoomExceptSender() {
    return this.socket.to(this.socket.handshake.user.room).emit.bind(this.socket);
  };

  get toAllTemp() {
    return (eventName, data, ...rest) => {
      this.toSender(eventName, data);
      this.toAllExceptSender(eventName, data);
    };
  };

  get usersInCurrentRoom() {
    return Object.values(this.io.connected).reduce((acc, client) => {
      return client.handshake.user.room === this.socket.handshake.user.room
        ? [...acc, client.handshake.user.username]
        : acc;
    }, []);
  }

  sendPrivateMessage = (id, msg) => this.io.to(id).emit('html:message:private', msg).bind(this.io);

  sendWelcomeMsg = () => {
    this.server.render('message', formatMessage( 'Welcome to the Chat!').admin(), (err, html) => {
      this.toSender('html:message:admin', html);
    });
  };

  sendHistory = (history) => {
    this.server.render('historyMessage', { messages: history }, (err, html) => {
      this.toSender('html:message', html);
    });
  };

  informUserConnected = () => {
    this.server.render('message', formatMessage( `${this.socket.handshake.user.username} has joined the chat`).admin(), (err, html) => {
      this.toAllInRoomExceptSender('html:message:admin', html);
    });
  };

  informUserDisconnected = () => {
    this.server.render('message', formatMessage( `${this.socket.handshake.user.username} has left the chat`).admin(), (err, html) => {
      this.toAllInRoomExceptSender('html:message:admin', html);
    });
  };

  sendUsersList = () => {
    this.server.render('users', { users: this.usersInCurrentRoom }, (err, html) => {
      this.toAllInRoom('html:users', html);
    });
  };

  toggleUserIsTyping = (isTyping) => {
    if (isTyping) {
      this.server.render('typingMessage', { ...this.socket.handshake.user }, (err, html) => {
        this.toAllExceptSender('typing:start', html);
      });
    } else {
      this.toAllExceptSender('typing:end');
    }
  };

  sendMessage = (msg) => {
    this.server.render('message', formatMessage(msg, this.socket.handshake.user).peer(), (err, html) => {
      this.toAllInRoomExceptSender('html:message:peer', html);
      this.toSender('html:message:owner', html);
    });
  };
}

exports.createCommunication = (app, io) => () => new ServerCommunication(app, io);
