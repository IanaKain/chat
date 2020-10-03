const cookie = require('cookie');
const cookieParser = require('cookie-parser');
const logger = require('../utils/logger')(module);
const {createCommunication} = require('../utils/communication');
const socketEvents = require('../config/socketEvents.json');
const format = require('../utils/messages');
const sendInvite = require('../utils/mail');
const db = require('../db/index').collections();
const {ServerError} = require('../utils/error');
const config = require('../config/config');

module.exports = (app, sessionStore, io) => {
  const chat = io.of('/chat');
  const communicator = createCommunication(app, chat);
  const communicate = communicator();

  chat.use((socket, next) => {
    const handshakeData = socket.request;
    const handshakeCookie = cookie.parse(handshakeData.headers.cookie || '');
    const sidCookie = cookieParser.signedCookie(handshakeCookie[config.session.key], config.session.secret);

    sessionStore.load(sidCookie, (error, storeSession) => {
      if (error) { next(new ServerError(error, 'User is not authorized.')); }
      if (!storeSession || !storeSession.user) {
        next(new ServerError(error, 'User is not authorized.'));
      } else {
        // eslint-disable-next-line
        socket.handshake.user = storeSession.user;
        next();
      }
    });
  });

  let onceConnected = [];

  chat.on(socketEvents.connection, async (socket) => {
    const {user} = socket.handshake;

    try {
      communicate.setSocket(socket);
      socket.join(user.room);

      const messages = await db.chat.getRoomMessages(user.room, user.userId);

      communicate.sendHistory(messages);

      if (!onceConnected.find((id) => id === user.userId)) {
        onceConnected.push(user.userId);
        communicate.sendWelcomeMsg(socket);
        communicate.informUserConnected(socket);
      }

      communicate.sendUsersList();

      socket.on(socketEvents.typeStart, () => { communicate.toggleUserIsTyping(true, socket); });
      socket.on(socketEvents.typeEnd, () => { communicate.toggleUserIsTyping(false, socket); });

      socket.on(socketEvents.sendMessage, ({message: msg, files}) => {
        db.chat.addMessage({
          ...format.formatUserMessage({text: msg}, user),
          files: format.saveFilesReturnPathSync(files),
        })
          .then((message) => communicate.sendMessage(message, socket, {add: true}))
          .catch((error) => console.warn(error.message));
      });

      socket.on(socketEvents.editMessage, async (messageId, {message, files, emoji}) => {
        const prevMessage = await db.chat.getMessage(messageId);

        db.chat.editMessage(messageId, {
          text: message,
          files: files && format.saveFilesReturnPathSync(files),
          emoji: [...(prevMessage.emoji || []), emoji],
        })
          .then((newMessage) => {
            if (files && files.length) {
              format.removeFileSync(prevMessage.files);
            }

            return newMessage;
          })
          .then((newMessage) => {
            communicate.sendMessage(newMessage, socket, {update: true});
          })
          .catch((error) => console.warn(error.message));
      });

      socket.on(socketEvents.reactOnMessage, async (messageId, {emoji}) => {
        db.chat.addMessageReaction(messageId, emoji)
          .then((newMessage) => { communicate.reactOnMessage(newMessage); })
          .catch((error) => console.warn(error.message));
      });

      socket.on(socketEvents.deleteMessage, async (messageId) => {
        db.chat.deleteMessage(messageId)
          .then(() => communicate.removeMessage(messageId))
          .catch((error) => console.warn(error.message));
      });

      socket.on(socketEvents.sendInvite, (receivers, cb) => {
        sendInvite({from: user.username, to: receivers, link: socket.handshake.headers.origin})
          .then(cb)
          .catch((error) => communicate.toOwner(socketEvents.sendInviteResult, error.message));
      });

      socket.on(socketEvents.saveFile, async (file) => {
        const newFileAddr = format.saveFileSync(file, user.userId);

        await db.users.updateUser({userId: user.userId, avatar: newFileAddr});
        communicate.toSender(socket)(socketEvents.saveFileSuccess, newFileAddr);
      });


      socket.on(socketEvents.setStatus, async (status) => {
        await db.users.updateUser({userId: user.userId, status});
        communicate.toAllInRoom(socketEvents.setStatusSuccess, status, user.username);
      });

      socket.on(socketEvents.disconnect, async (data) => {
        setTimeout(async () => {
          const isDisconnected = Boolean(
            !communicate.usersInCurrentRoom.find(({username}) => username === user.username)
          );

          if (isDisconnected) {
            logger.info(`User ${user.username} disconnected ${data}`);
            onceConnected = onceConnected.filter((id) => id !== user.userId);
            await db.users.updateUser({userId: user.userId, status: 'offline'});
            communicate.sendUsersList();
            communicate.informUserDisconnected(socket);
            communicate.removeSocket();

            app.locals.username = null;
            app.locals.room = null;
          }
        }, 3000);
      });
    } catch (e) {
      throw Error(e);
    }
  });
};