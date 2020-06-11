const { MongoClient } = require('mongodb');
const config = require('../config/config');

class Client {
  constructor() {
    this.dbName = 'chat';
    this.client = null;
    this.__provider = new MongoClient(config.db.connectionStr, config.db.connectionOptions);
  }

  db() {
    return this.client.db(this.dbName);
  }

  connect() {
    return this.__provider.connect().then((client) => {
      this.client = client;
    });
  }

  close() {
    return this.client.close();
  }
}

const client = new Client();

module.exports = { client };
