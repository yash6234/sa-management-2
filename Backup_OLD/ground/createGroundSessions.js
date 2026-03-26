async function createGroundSessions(newConn, grounds) {
  const col = newConn.db.collection("groundsessions");
  const map = {};

  const sessions = {
    Morning: ["06:00", "12:00"],
    Afternoon: ["12:00", "17:00"],
    Evening: ["17:00", "22:00"],
    Night: ["22:00", "23:59"],
  };

  for (const gName in grounds) {
    for (const s in sessions) {
      let sess = await col.findOne({
        name: s,
        ground: grounds[gName]._id,
      });

      if (!sess) {
        const r = await col.insertOne({
          name: s,
          time_from: sessions[s][0],
          time_to: sessions[s][1],
          ground: grounds[gName]._id,
          ground_name: gName,
          active: true,
          delete: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        sess = await col.findOne({ _id: r.insertedId });
      }

      map[`${gName}_${s}`] = sess;
    }
  }

  return map;
}

module.exports = { createGroundSessions };
