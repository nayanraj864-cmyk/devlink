const { getDbConnection } = require('../config/database'); // Adjust based on your DB connection pattern

class FollowModel {
  /**
   * Initializes structural constraints for tracking networks.
   */
  static async initializeSchema() {
    const db = await getDbConnection();
    // Unique composite index handles duplicate prevention at the persistence layer
    await db.execute(`
      CREATE TABLE IF NOT EXISTS user_follows (
        id INT AUTO_INCREMENT PRIMARY KEY,
        follower_id INT NOT NULL,
        following_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_follow_pair (follower_id, following_id)
      );
    `);
  }

  /**
   * Creates a tracking connection between two unique users.
   */
  static async createFollow(followerId, followingId) {
    const db = await getDbConnection();
    try {
      await db.execute(
        'INSERT INTO user_follows (follower_id, following_id) VALUES (?, ?)',
        [followerId, followingId]
      );
      return true;
    } catch (error) {
      // Catch MySQL/SQL duplicate entry error code (ER_DUP_ENTRY)
      if (error.errno === 1062 || error.code === 'ER_DUP_ENTRY') {
        return false; // Prevented duplicate follow gracefully
      }
      throw error;
    }
  }

  /**
   * Drops a tracking connection safely.
   */
  static async removeFollow(followerId, followingId) {
    const db = await getDbConnection();
    const [result] = await db.execute(
      'DELETE FROM user_follows WHERE follower_id = ? AND following_id = ?',
      [followerId, followingId]
    );
    return result.affectedRows > 0;
  }

  /**
   * Aggregates count summaries for a targeted profile ID.
   */
  static async getFollowCounts(userId) {
    const db = await getDbConnection();
    
    const [followersCountRes] = await db.execute(
      'SELECT COUNT(*) as count FROM user_follows WHERE following_id = ?',
      [userId]
    );
    const [followingCountRes] = await db.execute(
      'SELECT COUNT(*) as count FROM user_follows WHERE follower_id = ?',
      [userId]
    );

    return {
      followersCount: followersCountRes[0].count,
      followingCount: followingCountRes[0].count
    };
  }
}

module.exports = FollowModel;
