let typing = false;
let timeout;
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

/* eslint-disable no-unused-vars */
const connect = () => {
  socket.connect();
};

const disconnect = () => {
  socket.disconnect();
  window.location.href = '/logout';
};

const picker = new EmojiButton();

picker.on('emoji', (emoji) => {
  document.querySelector('input').value += emoji;
});

const renderHTML = (html) => {
  if (html) {
    const messageBlock = document.getElementById('chat-message-block');

    messageBlock.innerHTML += html;
  } else {
    console.log('There is a problem:', html);
  }
};

const deleteMessage = (messageId) => {
  socket.emit(socketEvents.deleteMessage, messageId);
};

const editMessage = (messageId) => {
  messageIdInEditMode = messageId;
  const message = document.getElementById(messageId);
  const messageContent = message.querySelector('.message__user-content').textContent;
  const textInput = document.getElementById('message');

  textInput.value = messageContent;
  textInput.focus();
};
/* eslint-enable no-unused-vars */

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
  .on(socketEvents.renderMessage, (html) => {
    const chatMsgBlock = document.querySelector('.chat-messages');

    renderHTML(html);
    chatMsgBlock.scrollTop = chatMsgBlock.scrollHeight;
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

function autoGrow({target}) {
  const element = target;

  element.style.height = `${element.scrollHeight}px`;
}

function onKeyDownNotEnter(event) {
  const element = event.target;
  const value = element.value.trim();

  if (event.key === 'Enter' && !event.shiftKey && value) {
    event.preventDefault();

    if (messageIdInEditMode) {
      socket.emit(socketEvents.editMessage, messageIdInEditMode, value);
    } else {
      socket.emit(socketEvents.sendMessage, value);
      element.value = '';
      element.style.height = '34px';
      element.focus();
    }
  } else {
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
}

window.onload = function () {
  const chatForm = document.getElementById('chat-form');
  const textInput = document.getElementById('message');
  const inviteForm = document.getElementById('chat-invite-form');
  const inputUpload = document.getElementById('file');

  // textInput.addEventListener('click', () => {
  //   picker.showPicker();
  // });

  inputUpload.addEventListener('change', ({target}) => {
    const reader = new FileReader();

    reader.onload = (event) => { socket.emit(socketEvents.uploadFile, event.target.result); };
    reader.readAsDataURL(target.files[0]);
  });

  textInput.addEventListener('keydown', onKeyDownNotEnter);
  textInput.addEventListener('keyup', autoGrow);

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
