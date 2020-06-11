const { client } = require('./client');
const logger = require('../utils/logger')(module);

class Rooms {
  constructor() {
    this.collectionName = 'rooms';
  }

  findRoom = async (room) => {
    const collection = client.db().createCollection(this.collectionName);

    try {
      const roomCount = await collection.find({ room }).count();

      if (roomCount) {
        return roomCount;
      } else {
        this.addRoom(room);
        return 1;
      }
    } catch (error) {
      logger.warn(`Cannot find room. ${error.message}`);
      throw error;
    }
  };

  addRoom = async (room) => {
    const collection = client.db().collection(room);

    try {
      const result = await collection.insertOne({ room });

      logger.info(`Room ${room} added to DB. ${Object.keys(result)}`);
      return room;
    } catch (error) {
      logger.warn(`Cannot add room. ${error.message}`);
      throw error;
    }
  };

  clearCollection = async () => {
    await client.db().dropDatabase();
  };
}

module.exports = Rooms;
