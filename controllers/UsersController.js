import sha1 from 'sha1';
import dbClient from '../utils/db';

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
      return res.status(400).json({ error: 'User already exists' });
    }
    const hashedPassword = sha1(password);
    const result = await collection.insertOne({ email, password: hashedPassword });
    const newUser = {
      id: result.insertedId,
      email,
    };
    return res.status(201).json(newUser);
  }
}

export default UsersController;
