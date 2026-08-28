const FollowModel = require('../models/followModel');

/**
 * Initiates a follow connection between users.
 */
async function followUser(req, res) {
  try {
    const followerId = req.user.id; // Established from your authentication middleware token
    const followingId = parseInt(req.params.userId, 10);

    if (isNaN(followingId)) {
      return res.status(400).json({ message: 'Invalid target user identification criteria.' });
    }

    // Strict Guard: Self-follow prevented
    if (followerId === followingId) {
      return res.status(422).json({ 
        error: 'Unprocessable Entity',
        message: 'Self-follow prevented: You cannot follow your own profile account.' 
      });
    }

    const isCreated = await FollowModel.createFollow(followerId, followingId);
    
    // Strict Guard: Duplicate follows prevented
    if (!isCreated) {
      return res.status(409).json({ 
        error: 'Conflict',
        message: 'Duplicate follow prevented: You are already following this user.' 
      });
    }

    // Retrieve updated network configurations metrics dynamically
    const counts = await FollowModel.getFollowCounts(followingId);

    return res.status(200).json({
      message: 'Successfully followed user.',
      data: {
        targetUserId: followingId,
        ...counts
      }
    });
  } catch (error) {
    console.error('Follow operation endpoint pipeline crash:', error);
    return res.status(500).json({ message: 'Internal Server Error committing network adjustment.' });
  }
}

/**
 * Terminates an existing follow relationship.
 */
async function unfollowUser(req, res) {
  try {
    const followerId = req.user.id;
    const followingId = parseInt(req.params.userId, 10);

    if (isNaN(followingId)) {
      return res.status(400).json({ message: 'Invalid target user identification criteria.' });
    }

    const wasRemoved = await FollowModel.removeFollow(followerId, followingId);

    if (!wasRemoved) {
      return res.status(404).json({ 
        message: 'Resource Error: No active follow link found matching these accounts.' 
      });
    }

    const counts = await FollowModel.getFollowCounts(followingId);

    return res.status(200).json({
      message: 'Successfully unfollowed user.',
      data: {
        targetUserId: followingId,
        ...counts
      }
    });
  } catch (error) {
    console.error('Unfollow operation endpoint pipeline crash:', error);
    return res.status(500).json({ message: 'Internal Server Error removing network adjustment.' });
  }
}

module.exports = { followUser, unfollowUser };
