const path = require('path');
const base64Img = require('base64-img');
const moment = require('moment');

const ADMIN = 'admin';

const userMessage = (user) => ({
  userId: user.userId,
  username: user.username,
  room: user.room,
  role: null,
  text: null,
  files: [],
  updateTime: null,
});

exports.formatAdminMessage = (msg) => ({
  ...msg,
  role: ADMIN,
  userId: ADMIN,
  username: ADMIN,
  createTime: moment().toISOString(),
  updateTime: null,
});

exports.formatUserMessage = (msg, user) => ({
  ...userMessage(user),
  ...msg,
});

exports.saveFilesReturnPath = (files) => {
  const result = [];

  files.forEach((file) => {
    base64Img.img(file, path.join(__dirname, 'public/upload'), Date.now(), (err, filePath) => {
      const arrPath = filePath.split('/');
      const fileName = arrPath[arrPath.length - 1];

      result.push(path.join('upload', fileName));
    });
  });

  return result;
};