const path = require('path');
const nodemailer = require("nodemailer");
const logger = require('../utils/logger')(module);

// Only needed if you don't have a real mail account for testing
// let testAccount = await nodemailer.createTestAccount();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: 'chat.info.invite@gmail.com',
    pass: 'isY46/js09(siT)'
  }
});


const sendInvite = async ({ from, to, link }) => {
  try {
    const result = await transporter.sendMail({
      from: 'chat.info.invite@gmail.com',
      to,
      subject: "Invite to chat",
      html: `
        <div>
          <b>Hey! ${from} wants to chat with you ;)</b>
          <br/>
          <b>Click at the image to open the chat</b>
        </div>
        <br/>
        <div>
          <a href=${link}>
            <img style="width:250px;" src="cid:dehcatta-liame-detcennocyats"/>
          </a>
        </div>
      `,
      attachments: [{
        filename: 'stayconnected.jpg',
        path: path.join(__dirname, '../public/images/stayconnected.jpg'),
        cid: 'dehcatta-liame-detcennocyats'
      }],
    });

    logger.info(`Email invite successfully has been sent to ${result.accepted.join(',')}`);

    if (result.messageId) {
      return result.messageId;
    }
  } catch (error) {
    logger.warn(`Error while sending email invite. ${error.message}`);
    throw new Error('Oops, email has not sent. Try again.');
  }
};

module.exports = sendInvite;
