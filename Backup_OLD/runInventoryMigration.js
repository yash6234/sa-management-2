require("dotenv").config();
const { connectDBs } = require("./helpers/db");

const { migrateInventory } = require("./inventory/migrateInventory");
const { migrateInventoryAllotments } = require("./inventory/migrateInventoryAllotments");

async function run() {
  const { oldConn, newConn } = await connectDBs();

  // 🔹 Single academy assumption
  const academy = await newConn.db.collection("academies").findOne({
    delete: false,
    active: true,
  });

  if (!academy) {
    throw new Error("No academy found in NEW DB");
  }

  console.log("✅ Academy detected:", academy.name);

  const inventoryMap = await migrateInventory(oldConn, newConn, academy);
  await migrateInventoryAllotments(oldConn, newConn, academy, inventoryMap);

  console.log("🎉 INVENTORY MIGRATION COMPLETED");

  await oldConn.close();
  await newConn.close();
  process.exit(0);
}

run().catch(err => {
  console.error("❌ Inventory migration failed:", err);
  process.exit(1);
});
