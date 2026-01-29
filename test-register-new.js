// Test registration endpoint
const axios = require('axios');

async function testRegistration() {
    try {
        console.log('Testing registration endpoint...\n');

        const userData = {
            name: 'Test User New',
            email: `testuser${Date.now()}@example.com`,
            password: 'TestPassword123'
        };

        console.log('Sending request to: http://localhost:5000/api/auth/register');
        console.log('Data:', {
            name: userData.name,
            email: userData.email,
            password: '********'
        });
        console.log('');

        const response = await axios.post('http://localhost:5000/api/auth/register', userData, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ SUCCESS!');
        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('❌ FAILED!');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response:', JSON.stringify(error.response.data, null, 2));
        } else if (error.request) {
            console.error('No response received from server');
            console.error('Is the backend running on port 5000?');
        } else {
            console.error('Error:', error.message);
        }
    }
}

testRegistration();
