async function setupMasters(newConn) {

  const academyCol = newConn.db.collection("academies");
  const sportsCol = newConn.db.collection("academysports");
  const sessionsCol = newConn.db.collection("academysessions");

  // Academy
  let academy = await academyCol.findOne({ delete: false });
  if (!academy) {
    const res = await academyCol.insertOne({
      name: "Gandhinagar Sports Academy",
      active: true,
      delete: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    academy = { _id: res.insertedId, name: "Gandhinagar Sports Academy" };
  }

  // Sport: Cricket
  let sport = await sportsCol.findOne({
    name: /cricket/i,
    academy: academy._id,
    delete: false,
  });

  if (!sport) {
    const res = await sportsCol.insertOne({
      name: "Cricket",
      academy: academy._id,
      academy_name: academy.name,
      active: true,
      delete: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    sport = { _id: res.insertedId, name: "Cricket" };
  }

  // Sessions
  const sessionDefs = [
    { name: "Morning", from: "06:00", to: "10:00" },
    { name: "Evening", from: "16:00", to: "19:00" },
    { name: "Night", from: "19:00", to: "22:00" },
  ];

  const sessions = {};

  for (const s of sessionDefs) {
    let session = await sessionsCol.findOne({
      name: s.name,
      academy: academy._id,
      delete: false,
    });

    if (!session) {
      const res = await sessionsCol.insertOne({
        name: s.name,
        session_from: s.from,
        session_to: s.to,
        academy: academy._id,
        academy_name: academy.name,
        active: true,
        delete: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      session = {
        _id: res.insertedId,
        name: s.name,
        session_from: s.from,
        session_to: s.to,
      };
    }

    sessions[s.name] = session;
  }

  return { academy, sport, sessions };
}

module.exports = { setupMasters };
