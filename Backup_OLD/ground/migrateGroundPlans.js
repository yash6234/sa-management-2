const { detectGroundSession } = require("../helpers/detectGroundSession");

async function migrateGroundPlans(oldConn, newConn, grounds, sessions) {
  const oldPlans = await oldConn.db
    .collection("details_tgs")
    .find({ category: { $in: ["GROUND-A", "GROUND-B"] } })
    .toArray();

  const newPlansCol = newConn.db.collection("groundplans");
  const planMap = {};

  for (const p of oldPlans) {
    if (!p.name || !p.category) continue;

    const sessionName = detectGroundSession(p);
    const session = sessions[`${p.category}_${sessionName}`];

    const exists = await newPlansCol.findOne({
      name: p.name,
      ground_name: p.category,
    });

    if (exists) {
      planMap[p._id.toString()] = exists;
      continue;
    }

    const r = await newPlansCol.insertOne({
      name: p.name,
      session_id: session?._id,
      time_from: p.from,
      time_to: p.to,
      ground: grounds[p.category]._id,
      ground_name: p.category,
      amount: p.amount,
      hours: (p.time_hr || 0) + (p.time_min || 0) / 60,
      active: p.active !== false,
      delete: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const newPlan = await newPlansCol.findOne({ _id: r.insertedId });
    planMap[p._id.toString()] = newPlan;
  }

  return planMap;
}

module.exports = { migrateGroundPlans };
