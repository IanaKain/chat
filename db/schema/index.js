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
    room: {
      bsonType: 'string',
    },
  },
};

const messageSchema = {
  bsonType: 'object',
  required: ['role', 'userId', 'username', 'text'],
  properties: {
    role: {
      bsonType: 'string',
      description: 'role is required',
    },
    userId: {
      bsonType: 'string',
      description: 'userId is required',
    },
    username: {
      bsonType: 'string',
      description: 'username is required',
    },
  },
};

exports.schema = {
  user: userSchema,
  message: messageSchema,
};
