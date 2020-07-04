const path = require('path');
const nodemailer = require("nodemailer");
const { google } = require("googleapis");
const OAuth2 = google.auth.OAuth2;
const logger = require('../utils/logger')(module);


const oauth2Client = new OAuth2(
  "11979912435-2toanlpde8dg7uk0krb2fu2a4i1l5c1m.apps.googleusercontent.com", // ClientID
  "8bJ1CBh-lZy5Yb6ZA9wQe2pp", // Client Secret
  "https://developers.google.com/oauthplayground" // Redirect URL
);

oauth2Client.setCredentials({
  refresh_token: "1//0414zBNIhkl-zCgYIARAAGAQSNwF-L9Irgn3IOCjzWm_DMNq7zYQ_n2k6hfh5woAuBVQanz7eTSBdTKFgIi5nTizNHz3OnwmfOTQ",
});

const accessToken = oauth2Client.getAccessToken();

const smtpTransport = nodemailer.createTransport({
  service: "gmail",
  auth: {
    type: "OAuth2",
    user: "chat.info.invite@gmail.com",
    clientId: "11979912435-2toanlpde8dg7uk0krb2fu2a4i1l5c1m.apps.googleusercontent.com",
    clientSecret: "8bJ1CBh-lZy5Yb6ZA9wQe2pp",
    refreshToken: "1//0414zBNIhkl-zCgYIARAAGAQSNwF-L9Irgn3IOCjzWm_DMNq7zYQ_n2k6hfh5woAuBVQanz7eTSBdTKFgIi5nTizNHz3OnwmfOTQ",
    accessToken: accessToken
  }
});

// Only needed if you don't have a real mail account for testing
// let testAccount = await nodemailer.createTestAccount();

// const transporter = nodemailer.createTransport({
//   service: "gmail",
//   secure: false,
//   auth: {
//     user: 'chat.info.invite@gmail.com',
//     pass: 'isY46/js09(siT)'
//   },
//   tls: { rejectUnauthorized: false }
// });


const sendInvite = async ({ from, to, link }) => {
  try {
    const result = await smtpTransport.sendMail({
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
