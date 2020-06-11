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
      const { insertedId } = await collection.insertOne({
        ...user, rooms: [user.currentRoom]
      });
      return { ...user, userId: insertedId };
    } catch (error) {
      logger.warn(`Cannot add user. ${error.message}`);
      throw new ServerError(error, 'Cannot add user');
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

  findAllUsersInRoom = async (currentRoom) => {
    const collection = client.db().collection(this.collectionName);

    try {
      if (currentRoom) {
        const results = await collection.find({ currentRoom }).toArray();
        return results;
      } else {
        logger.warn('Room name is not provided.');
        throw new ServerError({ message: 'Room name is not provided.' });
      }
    } catch (error) {
      logger.warn(`Cannot find users in room. ${error.message}`);
      throw new ServerError(error, 'Cannot find users in room');
    }
  };

  getAllUsers = async () => {
    const collection = client.db().collection(this.collectionName);

    try {
      const results = await collection.find().toArray();

      return results;
    } catch (error) {
      logger.warn(`Cannot get users. ${error.message}`);
      return new ServerError(error, 'Cannot get users');
    }
  };

  countUsers = async (username) => {
    try {
      const count = await collection.find({ username }).count();

      return count;
    } catch (error) {
      logger.warn(`Cannot count users. ${error.message}`);
      throw new ServerError(error, 'Cannot count users');
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
          currentRoom: user.currentRoom,
          rooms: user.rooms || []
        })
        : user;
    } catch (error) {
      logger.warn(`Cannot find user. ${error.message}`);
      throw new ServerError(error, 'Cannot find user');
    }
  };

  addRoomToUser = async (user, currentRoom) => {
    const collection = client.db().collection(this.collectionName);

    try {
      const result = await collection.findOneAndUpdate({ _id: ObjectID(user.userId) }, { $set: { currentRoom } });
      return result;
    } catch (error) {
      logger.warn(`Cannot add room to the user. ${error.message}`);
      throw new ServerError(new ServerError(error, 'Cannot add room to the user'));
    }
  };

  removeRoomFromUser = async (user) => {
    const collection = client.db().collection(this.collectionName);

    try {
      const result = await collection.updateOne({ username: user.username }, { $unset: { currentRoom: 1 } });
      return result;
    } catch (error) {
      logger.warn(`Cannot remove room from the user. ${error.message}`);
      throw new ServerError(new ServerError(error, 'Cannot remove room from the user'));
    }
  };

  addRoomToUserRooms = async (user, currentRoom) => {
    const collection = client.db().collection(this.collectionName);

    try {
      const result = await collection.findOneAndUpdate({ _id: user.userId }, { $addToSet: { rooms: currentRoom } });

      logger.info(`Room ${currentRoom} added to the user rooms. ${Object.keys(result)}`);
      return !!result.value;
    } catch (error) {
      logger.warn(`Cannot add room to the user room list. ${error.message}`);
      throw new ServerError(error, 'Cannot add room to the user room list');
    }
  };

  clearCollection = async () => {
    client.db().dropDatabase();
  };
}

module.exports = Users;
