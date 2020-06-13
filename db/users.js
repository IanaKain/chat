const { ObjectID } = require('mongodb');
const { client } = require('../db/client');
const { schema } = require('./schema/index');
const { ServerError } = require('../utils/error');
const logger = require('../utils/logger')(module);

class Users {
  constructor() {
    this.collectionName = 'users';
    this.schemaValidator = {
      validator: { $jsonSchema: schema.user }
    }
  }

  addUser = async (user) => {
    const collection = await client.db().createCollection(this.collectionName, this.schemaValidator);

    try {
      const { insertedId } = await collection.insertOne({ ...user });
      return { ...user, userId: insertedId };
    } catch (error) {
      logger.warn(`Cannot add user. ${error.message}`);
      throw new ServerError(error, 'Cannot add user');
    }
  };

  findUser = async (username) => {
    const collection = client.db().collection(this.collectionName);

    try {
      const user = await collection.findOne({ username });
      return user
        ? ({
          userId: user._id,
          username: user.username,
          password: user.password,
          room: user.room,
        })
        : user;
    } catch (error) {
      logger.warn(`Cannot find user. ${error.message}`);
      throw new ServerError(error, 'Cannot find user');
    }
  };

  addRoomToUser = async (user, room) => {
    const collection = client.db().collection(this.collectionName);

    try {
      const result = await collection.findOneAndUpdate({ _id: ObjectID(user.userId) }, { $set: { room } });
      return result;
    } catch (error) {
      logger.warn(`Cannot add room to the user. ${error.message}`);
      throw new ServerError(new ServerError(error, 'Cannot add room to the user'));
    }
  };

  removeUser = async (userId) => {
    const collection = client.db().collection(this.collectionName);

    try {
      const { deletedCount } = await collection.deleteOne({ _id: ObjectID(userId) });

      if (deletedCount === 1) {
        logger.info(`User ${userId} removed from DBs.`);
      }
      return deletedCount === 1;
    } catch (error) {
      logger.warn(`Cannot remove user. ${error.message}`);
      throw new ServerError(error, 'Cannot remove user');
    }
  };

  clearCollection = async () => {
    client.db().dropDatabase();
  };
}

module.exports = Users;
