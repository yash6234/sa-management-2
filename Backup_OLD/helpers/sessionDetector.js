function detectSessionFromName(name = "") {
  const n = name.toLowerCase();

  if (n.includes("morning")) return "Morning";
  if (n.includes("even")) return "Evening";
  if (n.includes("night") || n.includes("nite")) return "Night";

  return null;
}

module.exports = { detectSessionFromName };
