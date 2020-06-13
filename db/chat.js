const { client } = require('./client');
const { schema } = require('./schema/index');
const logger = require('../utils/logger')(module);

class Chat {
  constructor() {
    this.collectionName = 'messages';
    this.schemaValidator = {
      validator: { $jsonSchema: schema.message }
    }
  }

  getRoomMessages = async (room, userId) => {
    const collection = client.db().collection(this.collectionName);
    const includeFields = { userId: 1, username: 1, text: 1, time: 1 };
    const addField = { owner: { $cond: { if: { $eq: [ '$userId', userId ] }, then: true, else: false } } };

    try {
      const results = await collection.aggregate([
        { $match: { room } },
        { $project: { ...includeFields, ...addField } }
      ]).toArray();

      return results;
    } catch (error) {
      logger.warn(`Connected to DB. ${error.message}`);
      throw error;
    }
  };

  addMessage = async (data) => {
    const collection = await client.db().createCollection(this.collectionName, this.schemaValidator);

    try {
      const result = await collection.insertOne(data);

      logger.info(`Message inserted into db. ${Object.keys(result)}`);
      return data;
    } catch (error) {
      logger.warn(`Cannot add message. ${error.message}`);
      throw error;
    }
  };

  clearCollection = async () => {
    await client.db().dropDatabase();
  };
}

module.exports = Chat;
