require('dotenv').config();
const mongoose = require('mongoose');
const Review = require('./src/models/Review.model');

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log('Connected to MongoDB');

        const count = await Review.countDocuments();
        console.log('Total reviews in MongoDB:', count);

        const recent = await Review.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('fileName language status overallScore createdAt');

        console.log('\nRecent reviews:');
        if (recent.length === 0) {
            console.log('  No reviews found');
        } else {
            recent.forEach(r => {
                console.log(`  - ID: ${r._id}`);
                console.log(`    File: ${r.fileName}`);
                console.log(`    Language: ${r.language}`);
                console.log(`    Status: ${r.status}`);
                console.log(`    Score: ${r.overallScore}`);
                console.log(`    Created: ${r.createdAt}`);
                console.log('');
            });
        }

        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
        process.exit(0);
    })
    .catch(error => {
        console.error('Error:', error);
        process.exit(1);
    });
