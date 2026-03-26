const mongoose = require('mongoose');
const readlineSync = require('readline-sync');
const Admin = require('../models/Users'); // Update the path
require('dotenv').config();
// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

(async () => {
  try {
    const name = readlineSync.question('Enter name: ');
    const mobile_no = readlineSync.question('Enter mobile number: ');
    const email = readlineSync.questionEMail('Enter email: ');
    const date_of_birth = readlineSync.question('Enter date of birth (YYYY-MM-DD): ');
    const gender = readlineSync.question('Enter gender (male/female/other): ');
    const password = readlineSync.question('Enter password: ', { hideEchoBack: true });
    // const pin = readlineSync.question('Enter pin: ', { hideEchoBack: true });

    const newAdmin = new Admin({
      name,
      mobile_no,
      email,
      date_of_birth,
      gender,
      password,
      // pin,
        isVerified:true,
    });

    await newAdmin.save();
    console.log('✅ Admin user created successfully!');
  } catch (err) {
    console.error('❌ Error creating admin:', err.message);
  } finally {
    mongoose.disconnect();
  }
})();
