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
async function migrateReceipts(oldConn, newConn) {

  const oldCol = oldConn.db.collection("receipts");
  const newCol = newConn.db.collection("receipts");

  const oldReceipts = await oldCol.find().toArray();

  let inserted = 0;
  let skipped = 0;

  for (const r of oldReceipts) {

    // ❌ mandatory receipt_no
    if (!r.receipt_no) {
      skipped++;
      continue;
    }

    // 🧾 Build transactions array
    const transactions = [];

    if (r.cheque_no || r.bank_name) {
      transactions.push({
        method: "CHEQUE",
        cheque_no: r.cheque_no || "",
        cheque_date: r.cheque_date || "",
        bank_name: r.bank_name || "",
        amount: r.amount || 0,
      });
    }

    await newCol.insertOne({
      receipt_no: r.receipt_no,
      received_from: r.receipt_from || "",
      amount: r.amount || 0,
      amount_in_word:numberToWords( r.amount_in_word || "0"),
      description: "",
      transactions,
      roll_no: "",
      file_name: r.file_name || "",
      date: r.date || r.createdAt || new Date(),
      active: true,
      delete: r.delete === true,
      createdAt: r.createdAt || new Date(),
      updatedAt: new Date(),
    });

    inserted++;
  }

  console.log(`✅ Receipts inserted: ${inserted}`);
  console.log(`⚠️ Receipts skipped: ${skipped}`);
}

module.exports = { migrateReceipts };
