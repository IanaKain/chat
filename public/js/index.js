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

const getStatus = () => 'online';

const changeStatus = (status) => {
  socket.emit(socketEvents.setStatus, status);
};

const deleteMessage = (messageId) => {
  socket.emit(socketEvents.deleteMessage, messageId);
};

const picker = new EmojiButton();

picker.on('emoji', (emoji) => {
  if (messageIdInEditMode) {
    socket.emit(socketEvents.reactOnMessage, messageIdInEditMode, {emoji});
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

function uploadAvatarImg({target}) {
  if (target.files && target.files.length) {
    const processedFile = toBase64(target.files[0]);

    processedFile
      .then(({base64}) => socket.emit(socketEvents.saveFile, base64))
      .catch((error) => console.log('Could not save file', error));
  }
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
  const replyToBlock = document.querySelector('#reply');
  const files = processedFiles.map((file) => file.base64);

  if (!message && !files.length) { return; }

  messageIdInEditMode
    ? socket.emit(socketEvents.editMessage, messageIdInEditMode, {message, files})
    : socket.emit(socketEvents.sendMessage, {message, files});

  if (messageIdInReplyMode) {
    socket.emit(socketEvents.messageReply, messageIdInReplyMode, {message, files});
    messageIdInReplyMode = null;
  }

  replyToBlock.style.display = 'none';
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

function onEnterPress(event) {
  onKeyDown()(event);
}

function sendInvite(event) {
  event.preventDefault();
  const {email} = event.target.elements;

  socket.emit(socketEvents.sendInvite, email.value, () => {
    const div = document.createElement('div');
    const inviteConfirmation = document.getElementById('invite-confirmation');

    div.classList.add('invite-confirmation-text');
    div.innerHTML = 'Your invite has been sent';
    inviteConfirmation.appendChild(div);
    setTimeout(() => {
      const inviteConfirmationText = inviteConfirmation.querySelector('.invite-confirmation-text');

      inviteConfirmationText.remove();
    }, 3000);
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
    const messageBlock = document.getElementById('chat-message-block');

    messageBlock.innerHTML += html;
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
  .on(socketEvents.editMessageSuccess, (html, messageId) => {
    const messageToEdit = document.getElementById(messageIdInEditMode || messageId);
    const [editModeFlag, textInput, editBtn] =
      getElementsBySelectors('#edit-mode-flag', '#message', '.edit-message-btn');

    if (editModeFlag) {
      editModeFlag.remove();
    }

    messageToEdit.querySelector('.chat-message-update-content').outerHTML = html;
    textInput.value = '';
    textInput.focus();
    messageIdInEditMode = null;

    if (editBtn) {
      editBtn.disabled = false;
    }
  })
  .on(socketEvents.reactOnMessageSuccess, (html, messageId) => {
    const messageToEdit = document.getElementById(messageIdInEditMode || messageId);

    messageToEdit.querySelector('.chat-message-body').outerHTML = html;
    messageIdInEditMode = null;
  })
  .on(socketEvents.saveFileSuccess, (fileAddr) => {
    const avatar = document.querySelector('.user-data__photo-img');

    avatar.src = `/${fileAddr}`;
  })
  .on(socketEvents.setStatusSuccess, (status) => {
    const userData = document.querySelector('.header__user-data');
    const statusEl = document.querySelector('.user-data__status .status');

    statusEl.innerHTML = status;
    userData.className = `header__user-data ${status}`;
  });

window.onload = function () {
  const [chatForm, textInput, inviteForm, uploadFileWrap, imgPreview, emojiPicker, uploadAvatar] =
    getElementsBySelectors(
      '#chat-form', '#message', '#chat-invite-form', '#upload-file-container', '#images-list', '#emoji-picker',
      '#upload-avatar-container'
    );
  const inputFile = uploadFileWrap.querySelector('input[type="file"]');
  const avatarFile = uploadAvatar.querySelector('input[type="file"]');

  document.addEventListener('keydown', onEnterPress);
  emojiPicker.addEventListener('click', toggleEmojiPicker);
  inputFile.addEventListener('change', addFilesToPreviewList);
  avatarFile.addEventListener('change', uploadAvatarImg);
  imgPreview.addEventListener('click', removeFileFromPreviewList);
  textInput.addEventListener('keydown', onKeyDown());
  textInput.addEventListener('keyup', autoGrow);
  inviteForm.addEventListener('submit', sendInvite);
  chatForm.addEventListener('submit', (event) => {
    event.preventDefault();
    postMessage(event.target.elements.message.value);
  });
};
