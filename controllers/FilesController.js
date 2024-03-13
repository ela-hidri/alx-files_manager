import { v4 as uuidv4 } from 'uuid';
import mongoDBCore from 'mongodb/lib/core';
import { ObjectId } from 'mongodb';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

const fs = require('fs');

class FilesController {
  static async postUpload(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(400).json({ error: 'Unauthorized' });
    }
    const UserId = await redisClient.get(`auth_${token}`);
    const Usercollection = dbClient.db.collection('users');
    const FilesCollection = dbClient.db.collection('files');
    const user = await Usercollection.findOne({ _id: ObjectId(UserId) });
    if (!user) {
      return res.status(400).json({ error: 'Unauthorized' });
    }
    const {
      name, type, data, isPublic = false, parentId = 0,
    } = req.body;
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
      const file = await FilesCollection.findOne({ _id: ObjectId(parentId) });
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

  static async getShow(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const id = req.params;
    const fileId = new mongoDBCore.BSON.ObjectId(id);
    const file = await dbClient.db.collection('files')
      .findOne({ _id: fileId, userId });
    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    return res.status(200).json(file);
  }

  static async getIndex(req, res) {
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

    const parentId = req.query.parentId || '0';
    const page = Number.parseInt(req.query.page, 10) || 0;
    const pageSize = 20;
    const startIndex = page * pageSize;

    const filesFilter = {
      userId: user._id,
      parentId: parentId === '0' ? '0' : new mongoDBCore.BSON.ObjectId(parentId),
    };

    const files = await dbClient.filesCollection()
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
              $cond: { if: { $eq: ['$parentId', '0'] }, then: 0, else: '$parentId' },
            },
          },
        },
      ]).toArray();
    return res.status(200).json(files);
  }
}

module.exports = FilesController;
