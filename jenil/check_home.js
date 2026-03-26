const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const Home = require('./models/Home');

const checkDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const homes = await Home.find({});
        console.log('Total Home documents:', homes.length);
        console.log('Homes:', JSON.stringify(homes, null, 2));
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};
checkDB();
