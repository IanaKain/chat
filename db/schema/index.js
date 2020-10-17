const userSchema = {
  bsonType: 'object',
  required: ['username', 'password', 'room'],
  properties: {
    username: {
      bsonType: 'string',
      description: 'username is required',
    },
    password: {
      bsonType: 'string',
      description: 'password is required',
    },
    avatar: {
      bsonType: 'string',
    },
    status: {
      bsonType: 'string',
    },
    room: {
      bsonType: 'string',
    },
  },
};

const messageSchema = {
  bsonType: 'object',
  required: ['userId', 'username', 'room', 'files'],
  properties: {
    userId: {
      bsonType: 'string',
      description: 'userId is required',
    },
    username: {
      bsonType: 'string',
      description: 'username is required',
    },
    role: {
      bsonType: ['string', 'null'],
      description: 'username is required',
    },
    room: {
      bsonType: 'string',
      description: 'user room is required',
    },
    text: {
      bsonType: ['string', 'null'],
      description: 'user text input',
    },
    pre: {
      bsonType: ['string', 'null'],
      description: 'user reply',
    },
    imgSrc: {
      bsonType: ['string', 'null'],
      description: 'user image upload',
    },
    files: {
      bsonType: ['array'],
      description: 'files is required',
    },
    emoji: {
      bsonType: ['array'],
    },
  },
};

exports.schema = {
  user: userSchema,
  message: messageSchema,
};
