import AppController from '../controllers/AppController';
import UsersController from '../controllers/UsersController';
import FilesController from '../controllers/FilesController';
import AuthController from '../controllers/AuthController';

const express = require('express');

const router = express.Router();

router.get('/status', (req, res) => {
  AppController.getStatus(req, res);
});

router.get('/stats', (req, res) => {
  AppController.getStats(req, res);
});

router.get('/connect', AuthController.getConnect);
router.get('/disconnect', AuthController.getDisconnect);

router.get('/users/me', UsersController.getMe);

router.post('/users', (req, res) => {
  UsersController.postNew(req, res);
});

router.post('/files', (req, res) => {
  FilesController.postUpload(req, res);
});

router.put('/files/:id/publish', (req, res) => {
  FilesController.putPublish(req, res);
});

router.put('/files/:id/unpublish', (req, res) => {
  FilesController.putUnpublish(req, res);
});

router.get('/files/:id', FilesController.getShow);
router.get('/files', FilesController.getIndex);

module.exports = router;
