import AppController from '../controllers/AppController';
import UsersController from '../controllers/UsersController';
import FilesController from '../controllers/FilesController';

const express = require('express');

const router = express.Router();

router.get('/status', (req, res) => {
  AppController.getStatus(req, res);
});

router.get('/stats', (req, res) => {
  AppController.getStats(req, res);
});

router.post('/users', (req, res) => {
  UsersController.postNew(req, res);
});

router.post('/files', (req, res) => {
  FilesController.postUpload(req, res);
});

module.exports = router;
