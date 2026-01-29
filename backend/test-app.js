require('dotenv').config();
console.log('Loading app...');
try {
    const app = require('./src/app');
    console.log('App loaded successfully');
    console.log('App type:', typeof app);
} catch (error) {
    console.error('Error loading app:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
}
