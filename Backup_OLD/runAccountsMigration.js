require("dotenv").config();
const { connectDBs } = require("./helpers/db");
const { migrateAccounts } = require("./accounts/migrateAccounts");

async function run() {
  const { oldConn, newConn } = await connectDBs();

  await migrateAccounts(oldConn, newConn);

  console.log("🎉 ACCOUNTS MIGRATION COMPLETED");

  await oldConn.close();
  await newConn.close();
  process.exit(0);
}

run().catch(err => {
  console.error("❌ Accounts migration failed:", err);
  process.exit(1);
});
