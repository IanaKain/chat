const Client = require('./client');

class Rooms extends Client {
  constructor() {
    super();
    this.dbName = 'rooms';
  }

  findRoom = (room) => {
    return new Promise(async (resolve, reject) => {
      const client = await this.__getClient();
      const collection = client.db(this.dbName).collection(room);

      try {
        const roomCount = await collection.find({ room }).count();

        if (roomCount) {
          resolve(roomCount);
        } else {
          this.addRoom(room);
          console.log('Room added to DB');
          resolve(1);
        }
      } catch (error) {
        console.log('Cannot find room', error);
        reject(error);
      } finally {
        await client.close();
      }
    });
  };

  addRoom = (room) => {
    return new Promise(async (resolve, reject) => {
      const client = await this.__getClient();
      const collection = client.db(this.dbName).collection(room);

      try {
        const result = await collection.insertOne({ room });

        resolve(room);
      } catch (error) {
        console.log('Cannot add room', error);
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

module.exports = Rooms;
