const { MongoClient } = require('mongodb');

class DBClient {
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017; // Port should be a number, not a string
    this.dbName = process.env.DB_DATABASE || 'files_manager';
    this.client = new MongoClient(`mongodb://${host}:${port}`,
      {
        useUnifiedTopology: true,
        useNewUrlParser: true,
      });
    this.db = null;
  }

  async isAlive() {
    try {
      await this.client.connect();
      this.db = this.client.db(this.dbName);
      return true;
    } catch (error) {
      return false;
    }
  }

  async nbUsers() {
    try {
      const collection = this.db.collection('users');
      const count = await collection.countDocuments({});
      return count;
    } catch (error) {
      return -1;
    }
  }

  async nbFiles() {
    try {
      const collection = this.db.collection('files');
      const count = await collection.countDocuments({});
      return count;
    } catch (error) {
      return -1;
    }
  }
}

const dbClient = new DBClient();
module.exports = dbClient;
