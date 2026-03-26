function numberToWords(num) {
  const units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
  const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const thousands = ["", "Thousand", "Lakh", "Crore"];

  if (num === 0) return "Zero";

  let numStr = num.toString();
  let result = "";
  let chunkCount = 0;

  while (numStr.length > 0) {
    let chunk;
    if (chunkCount === 0) {
      chunk = parseInt(numStr.slice(-3));
      numStr = numStr.slice(0, -3);
    } else {
      chunk = parseInt(numStr.slice(-2));
      numStr = numStr.slice(0, -2);
    }

    if (chunk > 0) {
      let chunkStr = "";
      if (chunk >= 100) {
        chunkStr += units[Math.floor(chunk / 100)] + " Hundred ";
        chunk %= 100;
      }
      if (chunk >= 20) {
        chunkStr += tens[Math.floor(chunk / 10)] + " ";
        chunk %= 10;
      }
      if (chunk >= 10 && chunk < 20) {
        chunkStr += teens[chunk - 10] + " ";
        chunk = 0;
      }
      if (chunk > 0) {
        chunkStr += units[chunk] + " ";
      }
      result = chunkStr + thousands[chunkCount] + " " + result;
    }
    chunkCount++;
  }

  return result.trim() + " Only";
}

async function migrateAccounts(oldConn, newConn) {

  const oldTxCol = oldConn.db.collection("transactions");
  const newAccCol = newConn.db.collection("accounts");

  const oldTransactions = await oldTxCol
    .find()
    .sort({ createdAt: 1 }) // maintain order
    .toArray();

  let inserted = 0;
  let skipped = 0;

  for (const tx of oldTransactions) {

    // ❌ mandatory checks
    if (!tx.amt_in_out || typeof tx.amount !== "number") {
      skipped++;
      continue;
    }

    await newAccCol.insertOne({
      amt_in_out: tx.amt_in_out,
      identification: tx.identification || "",
      amount: tx.amount,
      amount_in_word:  numberToWords(tx.amount||0), // optional
      description: tx.description || "",
      payment_method: tx.method || "CASH",
      date: tx.createdAt || new Date(),
      active: true,
      delete: false,
      createdAt: tx.createdAt || new Date(),
      updatedAt: new Date(),
    });

    inserted++;
  }

  console.log(`✅ Accounts inserted: ${inserted}`);
  console.log(`⚠️ Accounts skipped: ${skipped}`);
}

module.exports = { migrateAccounts };
