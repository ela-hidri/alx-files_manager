import sha1 from 'sha1';
import dbClient from '../utils/db';

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Missing email' });
    }
    if (!password) {
      res.status(400).json({ error: 'Missing password' });
    }
    const collection = dbClient.db.collection('users');
    const user = await collection.findOne({ email });
    if (user) {
      res.status(400).json({ error: 'Already exist' });
    } else {
      const hashed = sha1(password);
      const rst = await collection.insertOne({ email, hashed });
      const NewUser = {
        email,
        id: rst.ops[0].id,
      };
      res.status(201).json(NewUser);
    }
  }
}

module.exports = UsersController;
