const Client = require('./client');

class Chat extends Client {
  constructor() {
    super();
    this.dbName = 'chat';
    this.messagesCollection = 'messages';
  }

  getMessages = (room, userId) => {
    return new Promise(async (resolve, reject) => {
      const client = await this.__getClient();
      const collection = client.db(this.dbName).collection(this.messagesCollection);
      const includeFields = { userId: 1, username: 1, text: 1, time: 1 };
      const addField = { owner: { $cond: { if: { $eq: [ '$_id', userId ] }, then: true, else: false } } };

      try {
        const results = await collection.aggregate([
          { $match: { room } },
          { $project: { ...includeFields, ...addField } }
        ]).toArray();

        resolve(results);
      } catch (error) {
        console.log('Cannot get messages', error);
        reject(error);
      } finally {
        await client.close();
      }
    });
  };

  addMessage = (data) => {
    return new Promise(async (resolve, reject) => {
      const client = await this.__getClient();
      const collection = client.db(this.dbName).collection(this.messagesCollection);

      try {
        const result = await collection.insertOne(data);

        console.log('chat message inserted into db: ' + Object.keys(result));
        resolve(data);
      } catch (error) {
        console.log('Cannot add message', error);
        reject(error);
      } finally {
        await client.close();
      }
    });
  };

  clearCollection = async () => {
    const client = await this.__getClient();
    client.db(this.dbName).dropDatabase();
  };
}

module.exports = Chat;
