const userSchema = {
  bsonType: "object",
  required: ["username", "password", "room"],
  properties: {
    username: {
      bsonType: "string",
      description: "username is required"
    },
    password: {
      bsonType: "string",
      description: "password is required"
    },
    room: {
      bsonType: "string",
    },
  }
};

const messageSchema = {
  bsonType: "object",
  required: ["role", "userId", "username", "text", "time"],
  properties: {
    role: {
      bsonType: "string",
      description: "role is required"
    },
    userId: {
      bsonType: "string",
      description: "userId is required"
    },
    username: {
      bsonType: "string",
      description: "username is required"
    },
    text: {
      bsonType: "string",
      description: "text is required"
    },
  }
};

exports.schema = {
  user: userSchema,
  message: messageSchema,
};
