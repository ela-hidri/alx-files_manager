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
    }
    const hashedPassword = sha1(password);
    const result = await collection.insertOne({ email, password: hashedPassword });
    const newUser = {
      id: result.insertedId,
      email,
    };
    res.status(201).json(newUser);
  }
}

export default UsersController;
