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

const deleteMessage = (messageId) => {
  socket.emit(socketEvents.deleteMessage, messageId);
};

const picker = new EmojiButton();

picker.on('emoji', (emoji) => {
  if (messageIdInEditMode) {
    socket.emit(socketEvents.editMessage, messageIdInEditMode, {emoji});
  } else {
    document.querySelector('textarea').value += emoji;
  }
});
/* eslint-enable no-unused-vars */

function getElementsBySelectors(...selectors) {
  return selectors.map((s) => document.querySelector(s));
}

function toggleEmojiPicker(messageId) {
  if (typeof messageId === 'string') {
    messageIdInEditMode = messageId;
  }

  picker.pickerVisible ? picker.hidePicker() : picker.showPicker();
}

function addFilesToPreviewList({target}) {
  addFiles(target.files);
}

function removeFileFromPreviewList({target}) {
  // Listen for a click to the specific clear button
  if (target.matches('.image-clear-icon')) {
    const fileToken = target.getAttribute('data-upload-token');
    const selectedFileIndex = processedFiles
      .findIndex(({file}) => file && file.token === fileToken);

    deleteFileByIndex(selectedFileIndex);
  }
}

function postMessage(message) {
  const textInput = document.getElementById('message');
  const files = processedFiles.map((file) => file.base64);

  messageIdInEditMode
    ? socket.emit(socketEvents.editMessage, messageIdInEditMode, {message, files})
    : socket.emit(socketEvents.sendMessage, {message, files});

  textInput.value = '';
  textInput.style.height = '34px';
  clearPreviewPanel();
  textInput.focus();
}

function onUserIsTyping() {
  let typingTimeout = null;

  const onTypingStop = () => {
    socket.emit(socketEvents.typeEnd);

    clearTimeout(typingTimeout);
    typingTimeout = null;
  };

  const onTypingStart = () => {
    if (!typingTimeout) {
      socket.emit(socketEvents.typeStart);
    }

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(onTypingStop, 1500);
  };

  onTypingStart();
}

function onKeyDown() {
  return (event) => {
    const textInput = document.getElementById('message');
    const imagesList = document.getElementById('images-list');
    const value = textInput.value.trim();
    const imageListIsOpened = imagesList.classList.contains('active');

    if (event.key === 'Enter' && !event.shiftKey && (value || imageListIsOpened)) {
      event.preventDefault();

      return postMessage(value);
    }

    if (event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }

    onUserIsTyping();
  };
}

function sendInvite(event) {
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
}

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
    const [editModeFlag, textInput, editBtn] =
      getElementsBySelectors('#edit-mode-flag', '#message', '.edit-message-btn');

    if (editModeFlag) {
      editModeFlag.remove();
    }

    messageToEdit.outerHTML = html;
    textInput.value = '';
    textInput.focus();
    messageIdInEditMode = null;

    if (editBtn) {
      editBtn.disabled = false;
    }
  });

window.onload = function () {
  const [chatForm, textInput, inviteForm, uploadFileContainer, imagePreview, emojiPicker] = getElementsBySelectors(
    '#chat-form', '#message', '#chat-invite-form', '#upload-file-container', '#images-list', '#emoji-picker'
  );
  const inputFile = uploadFileContainer.querySelector('input[type="file"]');

  emojiPicker.addEventListener('click', toggleEmojiPicker);
  inputFile.addEventListener('change', addFilesToPreviewList);
  imagePreview.addEventListener('click', removeFileFromPreviewList);
  textInput.addEventListener('keydown', onKeyDown());
  textInput.addEventListener('keyup', autoGrow);
  inviteForm.addEventListener('submit', sendInvite);
  chatForm.addEventListener('submit', (event) => {
    event.preventDefault();
    postMessage(event.target.elements.message.value);
  });
};
