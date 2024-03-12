import { v4 as uuidv4 } from 'uuid';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

const fs = require('fs');

class FilesController {
  static async postUpload(req, res) {
    const token = req.headers['X-Token'];
    if (!token) {
      return res.status(400).json({ error: 'Unauthorized' });
    }
    const UserId = await redisClient.get(token);
    const Usercollection = dbClient.db.collection('users');
    const FilesCollection = dbClient.db.collection('files');
    const user = await Usercollection.findOne({ id: UserId });
    if (!user) {
      return res.status(400).json({ error: 'Unauthorized' });
    }
    const {
      name, type, data,
    } = req.body;
    const isPublic = req.body.isPublic || false;
    const parentId = req.body.parentId || 0;
    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }
    if (!type || !(type in ['folder', 'file', 'image'])) {
      return res.status(400).json({ error: 'Missing type' });
    }
    if (!data && type !== 'folder') {
      return res.status(400).json({ error: 'Missing data' });
    }
    if (parentId) {
      const file = await Usercollection.findOne({ id: parentId });
      if (!file) {
        return res.status(400).json({ error: 'Parent not found' });
      } if (file.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }
    if (type === 'folder') {
      const result = await FilesCollection.insertOne({
        UserId, name, type, isPublic, parentId,
      });
      const newFile = {
        id: result.insertedId,
        UserId,
        name,
        type,
        isPublic,
        parentId,
      };
      return res.status(201).json(newFile);
    }
    const path = process.env.FOLDER_PATH || '/tmp/files_manager';
    if (!fs.existsSync(path)) { fs.mkdirSync(path); }
    const filename = uuidv4();
    const localPath = `${path}/${filename}`;
    const fileData = Buffer.from(data, 'base64');

    fs.writeFileSync(localPath, fileData);
    const result = await FilesCollection.insertOne({
      UserId, name, type, isPublic, parentId, localPath,
    });
    const newFile = {
      id: result.insertedId,
      UserId,
      name,
      type,
      isPublic,
      parentId,
      localPath,
    };

    return res.status(201).json({ newFile });
  }
}

module.exports = FilesController;
