const path = require('path');
const nodemailer = require("nodemailer");
const { google } = require("googleapis");
const OAuth2 = google.auth.OAuth2;
const logger = require('../utils/logger')(module);
const config = require('../config/config');


const oauth2Client = new OAuth2(process.env.clientID, process.env.clientSecret, config.mailer.redirectURL);
oauth2Client.setCredentials({ refresh_token: process.env.refreshToken });

const accessToken = oauth2Client.getAccessToken();

const smtpTransport = nodemailer.createTransport({
  service: config.mailer.service,
  auth: {
    type: config.mailer.auth,
    user: config.mailer.user,
    clientId: process.env.clientID,
    clientSecret: process.env.clientSecret,
    refreshToken: process.env.refreshToken,
    accessToken: accessToken
  }
});

const sendInvite = async ({ from, to, link }) => {
  try {
    const result = await smtpTransport.sendMail({
      from: config.mailer.user,
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
