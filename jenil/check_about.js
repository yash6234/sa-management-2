const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const AboutAcademy = require('./models/AboutAcademy');

async function checkAbout() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const about = await AboutAcademy.findOne({ isActive: true }).sort({ updatedAt: -1 });
        console.log(JSON.stringify(about, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        mongoose.connection.close();
    }
}
checkAbout();
