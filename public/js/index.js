let typing = false;
let timeout = undefined;
const senderTypes = {
  admin: 'admin',
  owner: 'owner',
  peer: 'peer'
};
const events = {
  connect: 'connect',
  disconnect: 'disconnect',
  typeStart: 'typing:start',
  typeEnd: 'typing:end',
  sendMessage: 'message:send',
  sendInvite: 'email:send',
  sendInviteResult: 'email:result',
  renderUsers: 'html:users',
  renderMessageHistory: 'html:message',
  renderAdminMessage: 'html:message:admin',
  renderOwnerMessage: 'html:message:owner',
  renderPeerMessage: 'html:message:peer',
};

const socket = io('/chat', {
  transports: ['websocket'],
  upgrade: false, query: "foo=bar",
  autoConnect: false,
});

const connect = () => {
  socket.connect();
};

const disconnect = () => {
  socket.disconnect();
  window.location.href = '/logout';
};

socket
  .on(events.connect, () => { console.log('socket connected', socket.id); })
  .on(events.disconnect, () => { window.location.href = '/logout'; })
  .on(events.sendInviteResult, notification => {
    const div = document.createElement('div');
    div.innerHTML = notification;

    const inviteConfirmation = document.getElementById('invite-confirmation');
    inviteConfirmation.appendChild(div);
    setTimeout(() => { inviteConfirmation.parentNode.removeChild(inviteConfirmation); }, 4000);
  })
  .on(events.typeStart, html => { document.getElementById("chat-message-isTyping").innerHTML = html; })
  .on(events.typeEnd, () => { document.getElementById("chat-message-isTyping").innerHTML = null; })
  .on(events.renderUsers, html => { document.querySelector('.chat-sidebar__room-users-data').innerHTML = html; })
  .on(events.renderMessageHistory, html => { document.getElementById("history-message-block").innerHTML = html; });

for (const type in senderTypes) {
  ((sender) => {
    const chatMsgBlock = document.querySelector('.chat-messages');

    socket.on(`${events.renderMessageHistory}:${sender}`, (html) => {
      renderHTML({ html, sender });
      chatMsgBlock.scrollTop = chatMsgBlock.scrollHeight;
    });
  })(senderTypes[type]);
}

function onKeyDownNotEnter(){
  const timeoutFunction = () => {
    typing = false;
    socket.emit(events.typeEnd);
  };

  if(!typing) {
    typing = true;
    socket.emit(events.typeStart);
    timeout = setTimeout(timeoutFunction, 1000);
  } else {
    clearTimeout(timeout);
    timeout = setTimeout(timeoutFunction, 1000);
  }
}

window.onload = function() {
  const chatForm = document.getElementById('chat-form');
  const textInput = document.getElementById("message");
  const inviteForm = document.getElementById("chat-invite-form");

  textInput.addEventListener('keydown', onKeyDownNotEnter);

  chatForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const message = event.target.elements.message;

    socket.emit(events.sendMessage, message.value, (a) => { console.log('events.sendMessage', a); });
    message.value = '';
    message.focus();
  });

  inviteForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const email = event.target.elements.email;

    socket.emit(events.sendInvite, email.value);
    setTimeout(() => { email.value = ''; }, 1000);
  });
};

function renderHTML({ html, sender }){
  if(html) {
    const message = document.createElement('div');
    message.classList.add('chat-message-block__message');
    message.classList.add(sender);
    message.innerHTML = html;

    document
      .getElementById("chat-message-block")
      .appendChild(message);
  } else {
    console.log("There is a problem:", html);
  }
}
