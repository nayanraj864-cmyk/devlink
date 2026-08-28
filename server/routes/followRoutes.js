const express = require('express');
const router = express.Router();
const { followUser, unfollowUser } = require('../controllers/followController');
const { requireAuthentication } = require('../middleware/authMiddleware');

router.post('/users/:userId/follow', requireAuthentication, followUser);
router.delete('/users/:userId/unfollow', requireAuthentication, unfollowUser);

module.exports = router;
