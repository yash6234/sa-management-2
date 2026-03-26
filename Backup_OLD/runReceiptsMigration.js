require("dotenv").config();
const { connectDBs } = require("./helpers/db");
const { migrateReceipts } = require("./receipts/migrateReceipts");

async function run() {
  const { oldConn, newConn } = await connectDBs();

  await migrateReceipts(oldConn, newConn);

  console.log("🎉 RECEIPTS MIGRATION COMPLETED");

  await oldConn.close();
  await newConn.close();
  process.exit(0);
}

run().catch(err => {
  console.error("❌ Receipts migration failed:", err);
  process.exit(1);
});
