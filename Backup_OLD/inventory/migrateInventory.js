async function migrateInventory(oldConn, newConn, academy) {

  const oldInvCol = oldConn.db.collection("inventories");
  const newInvCol = newConn.db.collection("academyinventories");

  const oldInventories = await oldInvCol.find().toArray();

  const inventoryMap = {}; // old_id → new_inventory

  let inserted = 0;

  for (const inv of oldInventories) {

    const exists = await newInvCol.findOne({
      name: inv.name,
      academy_id: academy._id,
      delete: false,
    });

    if (exists) {
      inventoryMap[inv._id.toString()] = exists;
      continue;
    }

    const result = await newInvCol.insertOne({
      name: inv.name,
      amount: inv.amount,
      qty: inv.qty,
      description: inv.description || "",
      academy_id: academy._id,
      active: inv.active !== false,
      delete: inv.delete === true,
      past_logs: [
        {
          legacy_inventory_id: inv._id,
          legacy_qty: inv.qty,
          legacy_amount: inv.amount,
          migrated_at: new Date(),
        },
      ],
      createdAt: inv.createdAt || new Date(),
      updatedAt: new Date(),
    });

    const newInv = await newInvCol.findOne({ _id: result.insertedId });
    inventoryMap[inv._id.toString()] = newInv;

    inserted++;
  }

  console.log(`✅ Inventory migrated: ${inserted}`);
  return inventoryMap;
}

module.exports = { migrateInventory };
