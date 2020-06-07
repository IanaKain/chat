const path = require('path');
const nodemailer = require("nodemailer");

// Only needed if you don't have a real mail account for testing
// let testAccount = await nodemailer.createTestAccount();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: 'chat.info.invite@gmail.com',
    pass: 'isY46/js09(siT)'
  }
});


const sendInvite = async ({ from, to }) => {
  try {
    const result = await transporter.sendMail({
      from: 'chat.info.invite@gmail.com',
      to,
      subject: "Invite to chat",
      html: `<div><b>Hey! ${from} wants to chat with you ;)</b></div><br/><div><img style="width:250px;" src="cid:dehcatta-liame-detcennocyats"></div>`,
      attachments: [{
        filename: 'stayconnected.jpg',
        path: path.join(__dirname, '../public/images/stayconnected.jpg'),
        cid: 'dehcatta-liame-detcennocyats'
      }],
    });

    console.log('Sent email result', result);
    console.log(path.join(__dirname, '../public/images/stayconnected.jpg'));

    if (result.messageId) { return result; }

  } catch (error) {
    console.log('Sent email error', error);
    throw new Error('Oops, email has not sent. Try again.');
  }
};

module.exports = sendInvite;
