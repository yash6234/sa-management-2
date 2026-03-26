const mongoose = require("mongoose");

async function connectDBs() {
  const oldConn = mongoose.createConnection(process.env.OLD_MONGO_URI);
  const newConn = mongoose.createConnection(process.env.MONGO_URI);

  await Promise.all([
    new Promise(res => oldConn.once("open", res)),
    new Promise(res => newConn.once("open", res)),
  ]);

  console.log("✅ Connected to OLD DB");
  console.log("✅ Connected to NEW DB");

  return { oldConn, newConn };
}

module.exports = { connectDBs };
