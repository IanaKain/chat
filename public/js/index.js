let typing = false;
let timeout = undefined;
let messageIdInEditMode = null;
const senderTypes = {
  admin: 'admin',
  owner: 'owner',
  peer: 'peer',
};

const socket = io('/chat', {
  transports: ['websocket'],
  upgrade: false,
  autoConnect: false,
  reconnection: false,
});

const connect = () => {
  socket.connect();
};

const disconnect = () => {
  socket.disconnect();
  window.location.href = '/logout';
};

socket
  .on(socketEvents.disconnect, () => { window.location.href = '/logout'; })
  .on(socketEvents.typeStart, (html) => { document.getElementById('chat-message-isTyping').innerHTML = html; })
  .on(socketEvents.typeEnd, () => { document.getElementById('chat-message-isTyping').innerHTML = null; })
  .on(socketEvents.renderUsers, (html) => { document.querySelector('.chat-sidebar__room-users-data').innerHTML = html; })
  .on(socketEvents.uploadFileResult, (path) => {
    const demoImage = document.createElement('img');

    demoImage.src = path;
    document
      .getElementById('chat-message-block')
      .appendChild(demoImage);
  })
  .on(socketEvents.renderMessageHistory, (html) => { document.getElementById('history-message-block').innerHTML = html; })
  .on(socketEvents.deleteMessageSuccess, (messageId) => {
    const element = document.getElementById(messageId);

    element.remove();
  })
  .on(socketEvents.editMessageSuccess, (html) => {
    const messageToEdit = document.getElementById(messageIdInEditMode);
    const textInput = document.getElementById('message');

    messageToEdit.outerHTML = html;
    textInput.value = '';
    textInput.focus();

    messageIdInEditMode = null;
  });

for (const type in senderTypes) {
  ((sender) => {
    const chatMsgBlock = document.querySelector('.chat-messages');

    socket.on(`${socketEvents.renderMessageHistory}:${sender}`, (html) => {
      renderHTML(html);
      chatMsgBlock.scrollTop = chatMsgBlock.scrollHeight;
    });
  })(senderTypes[type]);
}

function onKeyDownNotEnter() {
  const timeoutFunction = () => {
    typing = false;
    socket.emit(socketEvents.typeEnd);
  };

  if (!typing) {
    typing = true;
    socket.emit(socketEvents.typeStart);
    timeout = setTimeout(timeoutFunction, 1000);
  } else {
    clearTimeout(timeout);
    timeout = setTimeout(timeoutFunction, 1000);
  }
}

window.onload = function () {
  const chatForm = document.getElementById('chat-form');
  const textInput = document.getElementById('message');
  const inviteForm = document.getElementById('chat-invite-form');
  const inputUpload = document.getElementById('file');

  inputUpload.addEventListener('change', ({target}) => {
    const reader = new FileReader();

    reader.onload = (event) => { socket.emit(socketEvents.uploadFile, event.target.result); };
    reader.readAsDataURL(target.files[0]);
  });

  textInput.addEventListener('keydown', onKeyDownNotEnter);

  chatForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const {message} = event.target.elements;

    if (messageIdInEditMode) {
      socket.emit(socketEvents.editMessage, messageIdInEditMode, message.value);
    } else {
      socket.emit(socketEvents.sendMessage, message.value);
      message.value = '';
      message.focus();
    }
  });

  inviteForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const {email} = event.target.elements;

    socket.emit(socketEvents.sendInvite, email.value, () => {
      const div = document.createElement('div');
      const inviteConfirmation = document.getElementById('invite-confirmation');

      div.innerHTML = 'Your invite has been sent';
      inviteConfirmation.appendChild(div);
      setTimeout(() => { inviteConfirmation.parentNode.removeChild(inviteConfirmation); }, 4000);
    });
    setTimeout(() => { email.value = ''; }, 1000);
  });
};

function renderHTML(html) {
  if (html) {
    const messageBlock = document.getElementById('chat-message-block');

    messageBlock.innerHTML = messageBlock.innerHTML + html;
  } else {
    console.log('There is a problem:', html);
  }
}

function deleteMessage(messageId) {
  socket.emit(socketEvents.deleteMessage, messageId);
}

function editMessage(messageId) {
  messageIdInEditMode = messageId;
  const message = document.getElementById(messageId);
  const messageContent = message.querySelector('.message__user-content').textContent;
  const textInput = document.getElementById('message');

  textInput.value = messageContent;
  textInput.focus();
}
