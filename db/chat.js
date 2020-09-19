const moment = require('moment');
const {ObjectID} = require('mongodb');
const {client} = require('./client');
const {schema} = require('./schema/index');
const format = require('../utils/messages');
const logger = require('../utils/logger')(module);

class Chat {
  constructor() {
    this.collectionName = 'messages';
    this.schemaValidator = {
      validator: {$jsonSchema: schema.message},
    };
  }

  async getRoomMessages(room, userId) {
    const collection = client.db().collection(this.collectionName);

    try {
      const results = await collection.aggregate([
        {$match: {room}},
        {$group: {
          _id: {day: {$dayOfYear: '$_id'}},
          data: {$push: {
            $mergeObjects: [
              '$$ROOT',
              {createTime: {$toDate: '$_id'}},
              {role: {$cond: {if: {$eq: ['$userId', userId]}, then: 'owner', else: 'peer'}}}
            ],
          }},
        }},
        {$project: {
          _id: 0,
          day: '$_id.day',
          date: {$dateToString: {date: {$arrayElemAt: ['$data.createTime', 0]}, format: '%Y-%m-%d'}},
          data: '$data',
        }},
        {$sort: {day: 1}}
      ]).toArray();

      return results;
    } catch (error) {
      logger.warn(`Connected to DB. ${error.message}`);
      throw error;
    }
  }

  async getMessage(messageId) {
    const collection = await client.db().collection(this.collectionName);

    try {
      const message = await collection.findOne({_id: ObjectID(messageId)});

      return message;
    } catch (error) {
      logger.warn(`Cannot find message. ${error.message}`);
      throw error;
    }
  }

  async addMessage(data) {
    const collection = await client.db().createCollection(this.collectionName, this.schemaValidator);

    try {
      const result = await collection.insertOne(data);

      logger.info(`Message inserted into db. ${Object.keys(result)}`);

      return {...data, _id: result.insertedId, createTime: result.insertedId.getTimestamp()};
    } catch (error) {
      logger.warn(`Cannot add message. ${error.message}`);
      throw error;
    }
  }

  async editMessage(messageId, data) {
    const collection = await client.db().collection(this.collectionName);
    const updateProps = Object
      .keys(data)
      .reduce(
        (acc, key) => {
          if (data[key]) {
            if (Array.isArray(data[key])) {
              return data[key].length
                ? {...acc, [key]: data[key]}
                : acc;
            }

            return {...acc, [key]: data[key]};
          }

          return acc;
        }, {}
      );

    try {
      const result = await collection.findOneAndUpdate(
        {_id: ObjectID(messageId)},
        {$set: {...updateProps, updateTime: moment().toISOString()}},
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
  }

  async addMessageReaction(messageId, emoji) {
    const prevMessage = await this.getMessage(messageId);
    const collection = await client.db().collection(this.collectionName);
    const updatedEmoji = {emoji: [...(prevMessage.emoji || []), emoji]};

    try {
      const result = await collection.findOneAndUpdate(
        {_id: ObjectID(messageId)},
        {$set: {...updatedEmoji}},
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
  }

  async deleteMessage(messageId) {
    const prevMessage = await this.getMessage(messageId);
    const collection = await client.db().collection(this.collectionName);

    try {
      const result = await collection.deleteOne({_id: ObjectID(messageId)});

      if (result.deletedCount) {
        logger.info(`Message ${messageId} removed from db.`);
      } else {
        throw new Error(messageId);
      }

      if (prevMessage) {
        format.removeFileSync(prevMessage.files);
      }

      return result;
    } catch (error) {
      logger.warn(`Cannot remove message from db. ${error.message}`);
      throw error;
    }
  }

  async clearCollection() {
    await client.db().dropDatabase();
  }
}

module.exports = Chat;
