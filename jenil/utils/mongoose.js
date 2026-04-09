// Ensure we use the same Mongoose instance as the main project to share the DB connection
let mongoose;
try {
    mongoose = require('../../node_modules/mongoose');
} catch (e) {
    mongoose = require('mongoose');
}

module.exports = mongoose;
