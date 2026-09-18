const pool = require('../config/db');

exports.getProgress = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT technology, topics_completed, total_topics, quizzes_taken, interviews_taken, avg_score, updated_at
       FROM learning_progress WHERE user_id = $1 ORDER BY technology`,
      [req.user.id]
    );
    res.json({ progress: result.rows });
  } catch (err) {
    console.error('Get progress error:', err);
    res.status(500).json({ error: 'Server error fetching progress.' });
  }
};

exports.markTopicComplete = async (req, res) => {
  try {
    const { technology, totalTopics } = req.body;
    if (!technology) {
      return res.status(400).json({ error: 'technology is required.' });
    }
    const total = Number(totalTopics) || 10;

    await pool.query(
      `INSERT INTO learning_progress (user_id, technology, topics_completed, total_topics)
       VALUES ($1, $2, 1, $3)
       ON CONFLICT (user_id, technology)
       DO UPDATE SET
         topics_completed = LEAST(learning_progress.total_topics, learning_progress.topics_completed + 1),
         updated_at = NOW()`,
      [req.user.id, technology, total]
    );

    res.json({ message: 'Progress updated.' });
  } catch (err) {
    console.error('Mark topic complete error:', err);
    res.status(500).json({ error: 'Server error updating progress.' });
  }
};
