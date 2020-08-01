/* eslint-disable no-unused-vars */
let messageIdInEditMode = null;

function editMessage(messageId) {
  messageIdInEditMode = messageId;
  const message = document.getElementById(messageId);
  const messageContent = message.querySelector('.chat-message-text').textContent;
  const textInput = document.getElementById('message');

  textInput.value = messageContent;
  textInput.focus();
}

function renderHTML(html) {
  if (html) {
    const messageBlock = document.getElementById('chat-message-block');

    messageBlock.innerHTML += html;
  } else {
    console.log('There is a problem:', html);
  }
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
