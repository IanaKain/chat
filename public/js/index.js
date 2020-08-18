let typing = false;
let timeout;

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
  document.querySelector('textarea').value += emoji;
});

const deleteMessage = (messageId) => {
  socket.emit(socketEvents.deleteMessage, messageId);
};
/* eslint-enable no-unused-vars */

socket
  .on(socketEvents.disconnect, () => { window.location.href = '/logout'; })
  .on(socketEvents.typeStart, (html) => { document.getElementById('chat-message-isTyping').innerHTML = html; })
  .on(socketEvents.typeEnd, () => { document.getElementById('chat-message-isTyping').innerHTML = null; })
  .on(socketEvents.renderUsers, (html) => { document.querySelector('.chat-sidebar__room-users-data').innerHTML = html; })
  .on(socketEvents.renderMessage, (html) => {
    const chatMsgBlock = document.querySelector('.chat-messages');

    renderHTML(html);
    chatMsgBlock.scrollTop = chatMsgBlock.scrollHeight;
  })
  .on(socketEvents.renderMessageHistory, (html) => {
    const block = document.createElement('div');

    block.innerHTML = html;
    document.getElementById('history-message-block').appendChild(block);
  })
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

function toggleEmojiPicker() {
  picker.pickerVisible ? picker.hidePicker() : picker.showPicker();
}

function postMessage(message, target) {
  const element = target;
  const files = processedFiles.length ? processedFiles.map((file) => file.base64) : [];

  messageIdInEditMode
    ? socket.emit(socketEvents.editMessage, messageIdInEditMode, {message, files})
    : socket.emit(socketEvents.sendMessage, {message, files});

  element.value = '';
  element.style.height = '34px';
  clearPreviewPanel();
  element.focus();
}

function onKeyDownNotEnter(event) {
  const value = event.target.value.trim();

  if (event.key === 'Enter' && !event.shiftKey && value) {
    event.preventDefault();
    postMessage(value, event.target);
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
  const uploadFileContainer = document.getElementById('upload-file-container');
  const inputFile = uploadFileContainer.querySelector('input[type="file"]');
  const imagePreview = document.getElementById('images-list');
  const emojiPicker = document.getElementById('emoji-picker');

  emojiPicker.addEventListener('click', toggleEmojiPicker);

  inputFile.addEventListener('change', ({target}) => {
    addFiles(target.files);
  }, true);

  imagePreview.addEventListener('click', ({target}) => {
    // Listen for a click to the specific clear button
    if (target.matches('.image-clear-icon')) {
      const fileToken = target.getAttribute('data-upload-token');
      const selectedFileIndex = processedFiles
        .findIndex(({file}) => file && file.token === fileToken);

      deleteFileAtIndex(selectedFileIndex);
    }
  });

  // inputUpload.addEventListener('change', ({target}) => {
  //   inputUploadLabel.classList.add('active');
  //   inputUpload.setAttribute('disabled', 'true');
  // });

  // inputUploadLabel.addEventListener('click', () => {
  //   inputUploadLabel.classList.remove('active');
  //   inputUpload.removeAttribute('disabled');
  // });

  textInput.addEventListener('keydown', onKeyDownNotEnter);
  textInput.addEventListener('keyup', autoGrow);

  chatForm.addEventListener('submit', (event) => {
    event.preventDefault();
    postMessage(event.target.elements.message.value, event.target);
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
