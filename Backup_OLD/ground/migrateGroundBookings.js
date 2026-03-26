async function migrateGroundBookings(oldConn, newConn, grounds, sessions, planMap) {
  const oldBookings = await oldConn.db.collection("grounds").find().toArray();
  const newBookingsCol = newConn.db.collection("groundbookings");

  for (const b of oldBookings) {
    const ground = grounds[b.ground];
    const plan = planMap[b.plan_id?.toString()];
    if (!ground || !plan) continue;

    const session = await newConn.db.collection("groundsessions").findOne({
      _id: plan.session_id,
    });

    const paid = Number(b.advance || 0);
    const amount = Number(b.amount || 0);

    await newBookingsCol.insertOne({
      name: b.name,
      mobile_no: String(b.mobile_no),
      date: b.start_date,
      ground: ground._id,
      ground_name: b.ground,
      session_id: session?._id,
      session_name: session?.name,
      time_from: plan.time_from,
      time_to: plan.time_to,
      plan_id: plan._id,
      plan_name: plan.name,
      plan_amount: plan.amount,
      amount,
      paid,
      leftover: amount - paid,
      payment_type:
        b.payment_status === "Paid"
          ? "Paid"
          : b.payment_status === "Partial"
          ? "Partial"
          : "Pending",
      booking_by: b.booked_by,
      active: b.status !== false,
      delete: false,
      createdAt: b.createdAt || new Date(),
      updatedAt: new Date(),
    });
  }
}

module.exports = { migrateGroundBookings };
