async function createGrounds(newConn) {
  const col = newConn.db.collection("grounds");
  const map = {};

  for (const name of ["GROUND-A", "GROUND-B"]) {
    let g = await col.findOne({ name });
    if (!g) {
      const r = await col.insertOne({
        name,
        description: name,
        active: true,
        delete: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      g = await col.findOne({ _id: r.insertedId });
    }
    map[name] = g;
  }

  return map;
}

module.exports = { createGrounds };
