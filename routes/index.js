const express = require('express');

const AppController = require('../controllers/AppController');

const router = express.Router();

router.get('/status', (req, res) => {
  res.send(AppController.getStatus);
});

router.get('/stats', (req, res) => {
  res.send(AppController.g);
});

module.exports = router;
