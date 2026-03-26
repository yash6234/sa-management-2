function detectGroundSession(plan) {
  const n = (plan.name || "").toLowerCase();

  if (n.includes("morning")) return "Morning";
  if (n.includes("afternoon")) return "Afternoon";
  if (n.includes("evening")) return "Evening";
  if (n.includes("night")) return "Night";

  // fallback using time
  const hour = parseInt(plan.from?.split(":")[0] || "0");
  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  return "Evening";
}

module.exports = { detectGroundSession };
