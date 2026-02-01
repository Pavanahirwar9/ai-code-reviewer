// backend/routes/github.routes.js
/**
 * GitHub Integration Routes
 */

const express = require('express');
const router = express.Router();
const {
    initiateOAuth,
    handleCallback,
    getRepos,
    getBranches,
    analyzeRepo,
    getStatus,
    disconnect,
    getRepoTree,
    getFileContent,
    getMultipleFileContents,
    analyzeRepoFileByFile,
    getScans,
    getScan,
    addRepoByUrl,
    deleteRepo,
} = require('../controllers/github.controller');
const { protect } = require('../middleware/auth.middleware');
const { githubRepoValidation, validate } = require('../utils/validators');

// Public routes (OAuth)
router.get('/auth', initiateOAuth);
router.get('/callback', handleCallback);

// Protected routes
router.use(protect);

router.get('/status', getStatus);
router.get('/repos', getRepos);
router.get('/repos/:owner/:repo/branches', getBranches);
router.delete('/repos/:repoId', deleteRepo);
router.get('/scans', getScans);
router.get('/scan/:scanId', getScan);
router.post('/add-repo-url', addRepoByUrl);
router.post('/analyze', githubRepoValidation, validate, analyzeRepo);
router.post('/analyze-repo', analyzeRepoFileByFile);
router.post('/tree', getRepoTree);
router.post('/file', getFileContent);
router.post('/files', getMultipleFileContents);
router.post('/disconnect', disconnect);

module.exports = router;
