const { ObjectID } = require('mongodb');
const Client = require('./client');

class Users extends Client {
  constructor() {
    super();
    this.dbName = 'users';
    this.membersCollection = 'members';
  }

  addUser = ({ username, email, room }) => {
    return new Promise(async (resolve, reject) => {
      const client = await this.__getClient();
      const collection = client.db(this.dbName).collection(this.membersCollection);

      try {
        const { insertedCount, insertedId } = await collection.insertOne({ username, email, rooms: [room] });

        resolve({ id: insertedId, username, email, room });
      } catch (error) {
        console.log('Cannot add user', error);
        reject(error);
      } finally {
        await client.close();
      }
    });
  };

  removeUser = (id) => {
    return new Promise(async (resolve, reject) => {
      const client = await this.__getClient();
      const collection = client.db(this.dbName).collection(this.membersCollection);

      try {
        const { deletedCount } = await collection.deleteOne({ _id: ObjectID(id) });

        deletedCount && console.log('USER REMOVED ', id);
        resolve(deletedCount === 1);
      } catch (error) {
        console.log('Cannot remove user', error);
        reject(error);
      } finally {
        await client.close();
      }
    });
  };

  findAllUsersInRoom = (room) => {
    return new Promise(async (resolve, reject) => {
      const client = await this.__getClient();
      const collection = client.db(this.dbName).collection(this.membersCollection);

      try {
        const results = await collection.find({ rooms: room }).toArray();

        resolve(results);
      } catch (error) {
        console.log('Cannot find users in room', error);
        reject(error);
      } finally {
        await client.close();
      }
    });
  };

  getAllUsers = () => {
    return new Promise(async (resolve, reject) => {
      const client = await this.__getClient();
      const collection = client.db(this.dbName).collection(this.membersCollection);

      try {
        const results = await collection.find().toArray();

        resolve(results);
      } catch (error) {
        console.log('Cannot get users', error);
        reject(error);
      } finally {
        await client.close();
      }
    });
  };

  countUsers = (username) => {
    return new Promise(async (resolve, reject) => {
      const client = await this.__getClient();
      const collection = client.db(this.dbName).collection(this.membersCollection);

      try {
        const count = await collection.find({ username }).count();

        resolve(count);
      } catch (error) {
        console.log('Cannot count users', error);
        reject(error);
      } finally {
        await client.close();
      }
    });
  };

  findUser = (email) => {
    return new Promise(async (resolve, reject) => {
      const client = await this.__getClient();
      const collection = client.db(this.dbName).collection(this.membersCollection);

      try {
        const user = await collection.findOne({ email });

        user
          ? resolve({ id: user._id, username: user.username, email: user.email, rooms: user.rooms || [] })
          : resolve(user);
      } catch (error) {
        console.log('Cannot find user', error);
        reject(error);
      } finally {
        await client.close();
      }
    });
  };

  addRoomToUser = (user, room) => {
    return new Promise(async (resolve, reject) => {
      const client = await this.__getClient();
      const collection = client.db(this.dbName).collection(this.membersCollection);

      try {
        const result = await collection.findOneAndUpdate({ _id: user.id }, { $set: { rooms: [room] } })

        console.log('Room added to the user', result.value);
        resolve(!!result.value);
      } catch (error) {
        console.log('Cannot add room to the user', error);
        reject(error);
      } finally {
        await client.close();
      }
    });
  };

  addRoomToUserRooms = (user, room) => {
    return new Promise(async (resolve, reject) => {
      const client = await this.__getClient();
      const collection = client.db(this.dbName).collection(this.membersCollection);

      try {
        const result = await collection.findOneAndUpdate({ _id: user.id }, { $addToSet: { rooms: room } });

        console.log('Room added to the user', result.value);
        resolve(!!result.value);
      } catch (error) {
        console.log('Cannot add room to the user', error);
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

module.exports = Users;
