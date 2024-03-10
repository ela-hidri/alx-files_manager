import redisClient from '../utils/redis';

import dbClient from '../utils/db';

const AppController = {
  getStatus: (_req, res) => {
    const redis = redisClient.isAlive();
    const db = dbClient.isAlive();

    if (redis && db) {
      res.status(200).json({ redis: true, db: true });
    }
  },

  getStats: (_req, res) => {
    const files = dbClient.nbFiles();
    const users = dbClient.nbUsers();
    res.status(200).json({ users, files });
  },
};

module.exports = AppController;
