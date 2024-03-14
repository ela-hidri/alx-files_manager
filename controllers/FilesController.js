import { v4 as uuidv4 } from 'uuid';
import { ObjectId } from 'mongodb';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

const fs = require('fs');
const mime = require('mime-types');

class FilesController {
  static async postUpload(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = await redisClient.get(`auth_${token}`);
    const Usercollection = dbClient.db.collection('users');
    const user = await Usercollection.findOne({ _id: ObjectId(userId) });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const {
      name, type, data, isPublic = false,
    } = req.body;
    const { parentId } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }
    if (!type || !(['folder', 'file', 'image'].includes(type))) {
      return res.status(400).json({ error: 'Missing type' });
    }
    if (!data && type !== 'folder') {
      return res.status(400).json({ error: 'Missing data' });
    }
    const FilesCollection = dbClient.db.collection('files');
    if (parentId) {
      const idObject = new ObjectId(parentId);
      const file = await FilesCollection.findOne({ _id: idObject });
      if (!file) {
        return res.status(400).json({ error: 'Parent not found' });
      } if (file.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }
    if (type === 'folder') {
      const result = await FilesCollection.insertOne({
        userId: user._id, name, type, isPublic, parentId: parentId || 0,
      });
      return res.status(201).json({
        id: result.insertedId,
        userId: user._id,
        name,
        type,
        isPublic,
        parentId: parentId || 0,
      });
    }
    const path = process.env.FOLDER_PATH || '/tmp/files_manager';
    if (!fs.existsSync(path)) { fs.mkdirSync(path); }
    const filename = uuidv4();
    const localPath = `${path}/${filename}`;
    const fileData = Buffer.from(data, 'base64');

    fs.writeFileSync(localPath, fileData);
    const result = await FilesCollection.insertOne({
      userId: user._id, name, type, isPublic, parentId: parentId || 0, localPath,
    });
    return res.status(201).json({
      id: result.insertedId,
      userId: user._id,
      name,
      type,
      isPublic,
      parentId: parentId || 0,
      localPath,
    });
  }

  static async getShow(req, res) {
    try {
      const token = req.headers['x-token'];
      if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userId = await redisClient.get(`auth_${token}`);
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const { id } = req.params;
      const file = await dbClient.db.collection('files')
        .findOne({ _id: ObjectId(id), userId: ObjectId(userId) });
      if (!file) {
        return res.status(404).json({ error: 'Not found' });
      }

      return res.status(200).json(file);
    } catch (error) {
      console.error('Error occurred:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async getIndex(req, res) {
    try {
      const token = req.headers['x-token'];
      if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userId = await redisClient.get(`auth_${token}`);
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const user = await dbClient.db.collection('users').findOne({ _id: ObjectId(userId) });
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const parentId = req.query.parentId || 0;
      const page = Number.parseInt(req.query.page, 10) || 0;
      const pageSize = 20;
      const startIndex = page * pageSize;

      const filesFilter = {
        userId: user._id,
      };

      if (parentId) {
        if (parentId === '0') {
          filesFilter.parentId = parseInt(parentId, 10);
        } else {
          filesFilter.parentId = ObjectId(
            ObjectId.isValid(parentId) ? parentId : Buffer.alloc(24, '0').toString('utf-8'),
          );
        }
      }
      const files = await dbClient.db.collection('files')
        .aggregate([
          { $match: filesFilter },
          { $sort: { _id: -1 } },
          { $skip: startIndex },
          { $limit: pageSize },
          {
            $project: {
              _id: 0,
              id: '$_id',
              userId: '$userId',
              name: '$name',
              type: '$type',
              isPublic: '$isPublic',
              parentId: {
                $cond: { if: { $eq: ['$parentId', 0] }, then: 0, else: '$parentId' },
              },
            },
          },
        ]).toArray();

      return res.status(200).json(files);
    } catch (error) {
      console.error('Error occurred:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async putPublish(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const Usercollection = dbClient.db.collection('users');
    const user = await Usercollection.findOne({ _id: ObjectId(userId) });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const newValue = { $set: { isPublic: true } };

    try {
      const result = await dbClient.db.collection('files').findOneAndUpdate(
        { _id: ObjectId(id), userId: user._id },
        newValue,
        { returnOriginal: false },
      );

      if (!result.value) {
        return res.status(404).json({ error: 'Not found' });
      }

      return res.status(200).json(result.value);
    } catch (error) {
      console.error('Error occurred:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async putUnpublish(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const Usercollection = dbClient.db.collection('users');
    const user = await Usercollection.findOne({ _id: ObjectId(userId) });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const newValue = { $set: { isPublic: false } };

    try {
      const result = await dbClient.db.collection('files').findOneAndUpdate(
        { _id: ObjectId(id), userId: user._id },
        newValue,
        { returnOriginal: false },
      );

      if (!result.value) {
        return res.status(404).json({ error: 'Not found' });
      }

      return res.status(200).json(result.value);
    } catch (error) {
      console.error('Error occurred:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async getFile(req, res) {
    const idFile = req.params.id || '';
    const size = req.query.size || 0;

    const fileDocument = await dbClient.db
      .collection('files')
      .findOne({ _id: ObjectId(idFile) });
    if (!fileDocument) return res.status(404).send({ error: 'Not found' });

    const { isPublic } = fileDocument;
    const { userId } = fileDocument;
    const { type } = fileDocument;

    let user = null;
    let owner = false;

    const token = req.header('X-Token') || null;
    if (token) {
      const redisToken = await redisClient.get(`auth_${token}`);
      if (redisToken) {
        user = await dbClient.db
          .collection('users')
          .findOne({ _id: ObjectId(redisToken) });
        if (user) owner = user._id.toString() === userId.toString();
      }
    }

    if (!isPublic && !owner) return res.status(404).send({ error: 'Not found' });
    if (['folder'].includes(type)) return res.status(400).send({ error: "A folder doesn't have content" });

    const realPath = size === 0 ? fileDocument.localPath : `${fileDocument.localPath}_${size}`;

    try {
      const dataFile = fs.readFileSync(realPath);
      const mimeType = mime.contentType(fileDocument.name);
      res.setHeader('Content-Type', mimeType);
      return res.send(dataFile);
    } catch (error) {
      return res.status(404).send({ error: 'Not found' });
    }
  }
}

module.exports = FilesController;
