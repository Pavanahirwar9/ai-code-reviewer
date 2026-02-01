// backend/src/routes/migration.routes.js
/**
 * Migration Routes
 */

const express = require('express');
const router = express.Router();
const { migrateRepos } = require('../controllers/migration.controller');
const { protect } = require('../middleware/auth.middleware');

// Protected route - requires authentication
router.post('/repos', protect, migrateRepos);

module.exports = router;
