async function migrateInventoryAllotments(oldConn, newConn, academy, inventoryMap) {

  const oldAllotCol = oldConn.db.collection("alotinvs");
  const newAllotCol = newConn.db.collection("inventoryallotments");

  const oldAllots = await oldAllotCol.find().toArray();

  let inserted = 0;
  let skipped = 0;

  for (const a of oldAllots) {

    if (!a.inv_id || !inventoryMap[a.inv_id.toString()]) {
      skipped++;
      continue;
    }

    const inventory = inventoryMap[a.inv_id.toString()];

    await newAllotCol.insertOne({
      to: "",
      inventory: inventory._id,
      name: a.name,
      amount: a.amount,
      qty: a.qty,
      description:
        `${a.description || ""} ${a.payment_method ? `(Payment: ${a.payment_method})` : ""}`,
      academy_id: academy._id,
      active: a.active !== false,
      delete: a.delete === true,
      createdAt: a.createdAt || new Date(),
      updatedAt: new Date(),
    });

    inserted++;
  }

  console.log(`✅ Inventory allotments migrated: ${inserted}`);
  console.log(`⚠️ Inventory allotments skipped: ${skipped}`);
}

module.exports = { migrateInventoryAllotments };
