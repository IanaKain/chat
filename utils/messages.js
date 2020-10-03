const fs = require('fs');
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

function getEncodedWithExt(file) {
  const imageRegex = /^data:image\/\s*(.*?)\s*;base64/;
  const imageResult = file.match(imageRegex);

  if (imageResult) {
    const [_, ext] = imageResult;
    const encoded = file.replace(imageRegex, '');

    return [encoded, ext];
  }

  return '';
}

exports.saveFilesReturnPath = (files) => {
  const result = [];

  files.forEach((file) => {
    const [encoded, ext] = getEncodedWithExt(file);

    const fileAddr = `upload/${Date.now()}.${ext}`;
    const filePath = `public/${fileAddr}`;

    fs.writeFile(filePath, encoded, 'base64', (error) => {
      if (error) {
        throw new Error(error.message);
      }
    });

    result.push(fileAddr);
  });

  return result;
};

exports.saveFilesReturnPathSync = (files) => {
  const result = [];

  files.forEach((file) => {
    const [encoded, ext] = getEncodedWithExt(file);

    const fileAddr = `upload/${Date.now()}.${ext}`;
    const filePath = `public/${fileAddr}`;

    console.log('path', process.cwd());
    console.log('dir', fs.readdirSync(process.cwd()));

    fs.writeFileSync(filePath, encoded, 'base64');

    result.push(fileAddr);
  });

  return result;
};

exports.findFileSync = (folder) =>
  fs.readdirSync(folder ? `${process.cwd()}/public/${folder}` : `${process.cwd()}/public`);

exports.saveFileSync = (file, prefix) => {
  const [encoded, ext] = getEncodedWithExt(file);
  const fileAddr = `upload/${prefix}-${Date.now()}-avatar.${ext}`;
  const filePath = `public/${fileAddr}`;

  fs.writeFileSync(filePath, encoded, 'base64');

  return fileAddr;
};

exports.removeFileSync = (files, folder) => {
  files.forEach((fileAddr) => {
    fs.unlinkSync(folder ? `public/${folder}/${fileAddr}` : `public/${fileAddr}`);
  });
};
