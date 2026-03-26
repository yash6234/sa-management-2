require("dotenv").config();
const { connectDBs } = require("./helpers/db");
const { setupMasters } = require("./helpers/masters");
const { migratePlans } = require("./migratePlans");
const { migrateAdmissions } = require("./migrateAdmissions");

async function run() {
  const { oldConn, newConn } = await connectDBs();

  const masters = await setupMasters(newConn);
  await migratePlans(oldConn, newConn, masters);

  // 2️⃣ Migrate admissions and LINK plans by NAME
  await migrateAdmissions(oldConn, newConn, masters);

  console.log("🎉 MIGRATION COMPLETED SUCCESSFULLY");
  process.exit(0);
}

run();
