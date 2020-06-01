const { MongoClient } = require('mongodb');
const connectionStr = 'mongodb+srv://owner:zerogravity@mycluster-f7pss.mongodb.net/test?replicaSet=MyCluster-shard-0&authSource=admin&retryWrites=true&w=majority';
const connectionOptions = {
  keepAlive: 1,
  useNewUrlParser: true,
  useUnifiedTopology: true,
};

class Client {
  __getClient = () => {
    return new Promise(async (resolve, reject) => {
      const client = new MongoClient(connectionStr, connectionOptions);
      try {
        await client.connect();
        resolve(client);
      } catch (error) {
        console.log('Error while connect to mongo client', error.message, error.reason);
        await client.close();
        reject(error);
      }
    })
  };
}

module.exports = Client;
