const moment = require('moment');
const {ObjectID} = require('mongodb');
const {client} = require('./client');
const {schema} = require('./schema/index');
const logger = require('../utils/logger')(module);

class Chat {
  constructor() {
    this.collectionName = 'messages';
    this.schemaValidator = {
      validator: {$jsonSchema: schema.message},
    };
  }

  getRoomMessages = async (room, userId) => {
    const collection = client.db().collection(this.collectionName);
    const includeFields = {userId: 1, username: 1, text: 1, createTime: 1, updateTime: 1, imgSrc: 1};
    const addField = {role: {$cond: {if: {$eq: ['$userId', userId]}, then: 'owner', else: 'peer'}}};

    try {
      const results = await collection.aggregate([
        {$match: {room}},
        {$project: {...includeFields, ...addField}}
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

      return {...data, _id: result.insertedId};
    } catch (error) {
      logger.warn(`Cannot add message. ${error.message}`);
      throw error;
    }
  };

  editMessage = async (messageId, message) => {
    const collection = await client.db().collection(this.collectionName);

    try {
      const result = await collection.findOneAndUpdate(
        {_id: ObjectID(messageId)},
        {$set: {text: message, updateTime: moment().calendar(Date.now())}},
        {returnOriginal: false}
      );

      if (!result.ok) {
        throw new Error(messageId);
      }

      logger.info(`Message updated in db. ${messageId}`);

      return result.value;
    } catch (error) {
      logger.warn(`Cannot update message. ${error.message}`);
      throw error;
    }
  };

  deleteMessage = async (messageId) => {
    const collection = await client.db().collection(this.collectionName);

    try {
      const result = await collection.deleteOne({_id: ObjectID(messageId)});

      if (result.deletedCount) {
        logger.info(`Message ${messageId} removed from db.`);
      } else {
        throw new Error(messageId);
      }

      return result;
    } catch (error) {
      logger.warn(`Cannot remove message from db. ${error.message}`);
      throw error;
    }
  };

  clearCollection = async () => {
    await client.db().dropDatabase();
  };
}

module.exports = Chat;
