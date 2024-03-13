import sha1 from 'sha1';
import mongoDBCore from 'mongodb/lib/core';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }
    if (!password) {
      return res.status(400).json({ error: 'Missing password' });
    }

    const collection = dbClient.db.collection('users');
    const user = await collection.findOne({ email });
    if (user) {
      return res.status(400).json({ error: 'Already exist' });
    }
    const hashedPassword = sha1(password);
    const result = await collection.insertOne({ email, password: hashedPassword });
    const newUser = {
      id: result.insertedId,
      email,
    };
    return res.status(201).json(newUser);
  }

  static async getMe(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await (await dbClient.usersCollection())
      .findOne({ _id: new mongoDBCore.BSON.ObjectId(userId) });
    return res.status(200).json({ id: user._id.toString(), email: user.email });
  }
}

export default UsersController;
