const { detectSessionFromName } = require("./helpers/sessionDetector");

async function migratePlans(oldConn, newConn, masters) {
  const oldPlans = await oldConn.db
    .collection("detailsacademies")
    .find()
    .toArray();

  const newPlansCol = newConn.db.collection("academyplans");

  for (const plan of oldPlans) {
    // Check by NAME (case-insensitive)
    const exists = await newPlansCol.findOne({
      name: { $regex: `^${plan.name}$`, $options: "i" },
      academy: masters.academy._id,
      delete: false,
    });

    if (exists) continue;

    const sessionName = detectSessionFromName(plan.name);
    const session = sessionName ? masters.sessions[sessionName] : null;

    await newPlansCol.insertOne({
      name: plan.name,
      amount: plan.amount,
      days: plan.plan_limit,

      academy: masters.academy._id,
      academy_name: masters.academy.name,

      sports: masters.sport._id,
      sports_name: masters.sport.name,

      session_id: session?._id || null,
      session_time_from: session?.session_from || null,
      session_time_to: session?.session_to || null,

      registration_fee: 0,
      active: plan.active !== false,
      delete: false,

      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  console.log(`✅ Plans ensured by name matching`);
}

module.exports = { migratePlans };
