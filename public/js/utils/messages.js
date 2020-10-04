/* eslint-disable no-unused-vars */
let messageIdInEditMode = null;
let messageIdInReplyMode = null;

function editMessage(messageId) {
  const editModeFlag = document.createElement('div');
  const messageForm = document.getElementById('chat-form');
  const message = document.getElementById(messageId);
  const previewList = document.getElementById('images-list');
  const text = message.querySelector('.chat-message-text');
  const image = message.querySelector('.chat-message-uploaded-img');
  const textInput = document.getElementById('message');
  const editBtn = message.querySelector('.edit-message-btn');

  messageIdInEditMode = messageId;
  editBtn.disabled = true;

  editModeFlag.id = 'edit-mode-flag';
  editModeFlag.innerHTML = `<i class="fa fa-pencil" aria-hidden="true"/>`;
  editModeFlag.onclick = () => {
    messageIdInEditMode = null;

    if (editBtn) {
      editBtn.disabled = false;
    }

    processedFiles = [];
    previewList.className = '';
    previewList.innerHTML = '';
    textInput.value = '';
    editModeFlag.remove();
  };
  messageForm.prepend(editModeFlag);

  if (text) {
    textInput.value = text.textContent;
  }

  if (image) {
    const uploadFileContainer = document.getElementById('upload-file-container');
    const inputFile = uploadFileContainer.querySelector('input[type="file"]');

    inputFile.click();
  }

  textInput.focus();
}

function messageReply(messageId) {
  const replyModeFlag = document.createElement('div');
  const messageForm = document.getElementById('chat-form');
  const replyToBlock = messageForm.querySelector('#reply');

  const message = document.getElementById(messageId);
  const info = message.querySelector('.chat-message-header');

  const textInput = document.getElementById('message');
  const replyBtn = message.querySelector('.reply-btn');

  if (info) {
    const user = info.querySelector('.chat-message-user-info').textContent;
    const text = message.querySelector('.chat-message-text').textContent.slice(0, 20);

    replyToBlock.innerHTML = `reply to (${user}): ${text}...`;
  }

  replyToBlock.style.display = 'block';
  messageIdInReplyMode = messageId;
  replyBtn.disabled = true;

  replyModeFlag.id = 'reply-mode-flag';
  replyModeFlag.innerHTML = `<i class="fa fa-reply" aria-hidden="true"/>`;
  replyModeFlag.onclick = () => {
    messageIdInReplyMode = null;
    replyToBlock.style.display = 'none';

    if (replyBtn) {
      replyBtn.disabled = false;
    }

    textInput.value = '';
    replyModeFlag.remove();
  };
  messageForm.prepend(replyModeFlag);
  textInput.focus();
}

function autoGrow(event) {
  const textAreaValue = document.getElementById('message').value;
  const element = event.target;

  if (!textAreaValue.trim() && element.style.height) {
    element.style.height = '34px';

    return;
  }

  element.style.height = `${element.scrollHeight}px`;
}
