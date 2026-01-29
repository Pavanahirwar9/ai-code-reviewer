// Test user registration
require('dotenv').config();
const axios = require('axios');

async function testRegistration() {
    try {
        console.log('Testing user registration...\n');

        const userData = {
            name: 'Test User',
            email: `test${Date.now()}@example.com`, // unique email
            password: 'TestPassword123'
        };

        console.log('Sending registration request with:', {
            name: userData.name,
            email: userData.email,
            password: '********'
        });

        const response = await axios.post('http://localhost:5000/api/auth/register', userData);

        if (response.data.success) {
            console.log('\n✅ SUCCESS: User registered successfully!');
            console.log('Token received:', response.data.data.token.substring(0, 20) + '...');
            console.log('User data:', response.data.data.user);
        } else {
            console.log('\n❌ FAILED:', response.data);
        }
    } catch (error) {
        console.error('\n❌ Registration test failed:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }
    }
}

testRegistration();
