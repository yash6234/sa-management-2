require("dotenv").config();
const { connectDatabases } = require("./helpers/db");

const { createGrounds } = require("./ground/createGrounds");
const { createGroundSessions } = require("./ground/createGroundSessions");
const { migrateGroundPlans } = require("./ground/migrateGroundPlans");
const { migrateGroundBookings } = require("./ground/migrateGroundBookings");

async function run() {
  const { oldConn, newConn } = await connectDatabases();

  // 1️⃣ Create base masters
  const grounds = await createGrounds(newConn);

  // 2️⃣ Create sessions
  const sessions = await createGroundSessions(newConn, grounds);

  // 3️⃣ Plans migration
  const planMap = await migrateGroundPlans(
    oldConn,
    newConn,
    grounds,
    sessions
  );

  // 4️⃣ Booking migration
  await migrateGroundBookings(
    oldConn,
    newConn,
    grounds,
    sessions,
    planMap
  );

  console.log("🎉 GROUND MIGRATION FINISHED");

  await oldConn.close();
  await newConn.close();
  process.exit(0);
}

run().catch(err => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
