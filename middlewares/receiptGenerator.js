const { jsPDF } = require("jspdf");
const fs = require('fs');
const path = require('path');
const Setting = require('../models/Setting');
const Academy = require('../models/Academy');
const Receipts = require("../models/Receipts")
// Optional: for number to words
const toWords = require('number-to-words');
const mongoose = require("mongoose");
const SportsAcademy = require("../models/SportsAcademy")
const { logger } = require("../utils/enc_dec_c");
require('dotenv').config();
mongoose.connect(process.env.MONGO_URI).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));
/**
 * Generate 100% customizable receipt PDF
 * @param {Object} config - All customizable options
 * @returns {Promise<string>} - Path to generated PDF
 */

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

async function generateDynamicReceipt(academy_id, config = {}) {
  const dt1 = await Academy.findById(academy_id);
  if (!dt1 || dt1.delete == true || dt1.active == false) {
    logger.warn("Academy not found");
    return "Academy Not Found"
  }
  const {
    roll_no = "",
    // === Core Receipt Data ===
    receivedFrom = "John Doe",
    amount = "0",
    amountInWords = numberToWords(Number(amount) || 0) || null, // auto-generated if not provided
    paymentMethod = "cash",
    receiptDate = new Date().toISOString(),
    transactions = [
      { method: "Cash", amount: 500 },
      { method: "Online", amount: 1000 }
    ],
    // === Academy / Business Info ===
    academyName = dt1.name,
    address = dt1.address,
    phone = dt1.contact_phone,
    email = dt1.email,
    website = dt1.domain_name,
    remarks = "Payment received for academy membership. Contact us for any queries.",
    footerNote = "This is a computer-generated receipt and does not require a physical signature.",

    // === Output ===
    outputDir = path.join(__dirname, "../receipts"),

    saveToDB = false,
    dbModel = null, // pass your Mongoose model if needed

  } = config;
  const acr = academyName
    .trim()
    .split(/\s+/)          // split by spaces
    .map(word => word[0])  // take first letter of each word
    .join("")              // join them
    .toUpperCase();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const rcno = await Receipts.countDocuments({
    createdAt: {
      $gte: startOfMonth,
      $lt: startOfNextMonth
    }
  }) || 0;

  const year = now.getFullYear();       // e.g., 2025
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const rc_no = acr + year.toString() + (month) + String(rcno + 1).padStart(4, '0')
  const txList = transactions.slice(0, 5)

  // Calculate total amount
  const totalAmount = txList.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: [145, 210],
    compress: true,
  });

  doc.setProperties({
    title: `${academyName} Receipt`,
    subject: "Receipt for payment",
    author: academyName,
    keywords: "receipt, payment, sports, academy",
    creator: academyName,
  });
  const primaryColor = [0, 51, 102];
  const accentColor = [24, 77, 140];

  // Add outer border
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(1);
  doc.rect(5, 5, 200, 135);

  // Add inner decorative border
  doc.setDrawColor(...accentColor);
  doc.setLineWidth(0.5);
  doc.rect(7, 7, 196, 131);

  const dt = await Setting.findOne({ field: "logo" });
  const logo_file = dt.value;
  // Add logo and "RECEIPT" title
  const centerX = 145 / 2;
  const centerY = 210 / 2;
  const logoPath = path.join(__dirname, `../Logo/${logo_file}`);
  const stampPath = path.join(__dirname, `../Logo/stamp.png`);
  try {
    const logoData = fs.readFileSync(logoPath);
    const stamp = fs.readFileSync(stampPath);
    doc.addImage(logoData, "PNG", centerX - 60, 10, 25, 25);
    doc.addImage(stamp, "PNG", 145, 100, 25, 25); // Stamp on the right of center
  } catch (err) {
    console.warn("Failed to load logo:", err);
    doc.setFontSize(6);
    doc.setTextColor(80, 80, 80);
    doc.text("Logo not available", centerX - 30, 15, { align: "center" });
  }

  // Add "RECEIPT" title
  doc.setFillColor(...primaryColor);
  doc.roundedRect(centerX + 95, 12, 30, 8, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("RECEIPT", centerX + 110, 17.5, { align: "center" });

  // Add academy name
  doc.setFontSize(18);
  doc.setTextColor(...primaryColor);
  doc.setFont("helvetica", "bold");
  doc.text(academyName ? academyName : "", centerY, 20, { align: "center", maxWidth: 130 });

  // Add contact info
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(
    address ? address : "",
    centerY,
    26,
    { align: "center", maxWidth: 130 }
  );
  doc.text(
    `${phone} | ${email} | ${website}`,
    centerY,
    30,
    { align: "center", maxWidth: 150 }
  );

  // Add header line
  doc.setDrawColor(...accentColor);
  doc.setLineWidth(0.5);
  doc.line(10, 40, 200, 40);

  // Format the date


  // Add receipt details
  doc.setTextColor(...primaryColor);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");

  // Receipt No
  doc.text("Receipt No:", 20, 47);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(60, 60, 60);
  doc.text(`${rc_no}`, 45, 47);

  // Date
  doc.setTextColor(...primaryColor);
  doc.setFont("helvetica", "bold");
  doc.text("Date:", centerX + 70, 47);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(60, 60, 60);
  doc.text(new Date(receiptDate).toLocaleString("en-IN"), centerX + 85, 47);

  // Horizontal separator
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(10, 51, 200, 51);

  // Receipt details
  doc.setTextColor(...primaryColor);
  doc.setFont("helvetica", "bold");
  doc.text("Student Name", 20, 59);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(60, 60, 60);
  doc.text(receivedFrom, 70, 59, { maxWidth: 75 });

  doc.setTextColor(...primaryColor);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Roll No:", centerX + 60, 59);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(60, 60, 60);
  doc.text(`${roll_no}`, centerX + 90, 59);

  doc.setTextColor(...primaryColor);
  doc.setFont("helvetica", "bold");
  doc.text("The Sum of Rupees:", 20, 65);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(8);
  doc.text(amountInWords, 70, 65, { maxWidth: 65 });



  // ================================
  //  COMPACT TRANSACTION TABLE
  // ================================

  let tableY = 70;   // starting position (slightly up)

  // Title
  doc.setTextColor(...primaryColor);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Payment Details:", 20, tableY);

  tableY += 4; // small spacing

  // ==== Header (smaller height) ====
  const headerHeight = 5;
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.3);
  doc.rect(20, tableY, 160, headerHeight);

  doc.setFontSize(7.5);
  doc.setTextColor(0, 0, 0);
  doc.text("Method", 23, tableY + 3.5);
  doc.text("Amount (Rs.)", 155, tableY + 3.5);

  // ==== Rows (compact 4mm height) ====
  let rowHeight = 4.5;
  let currentY = tableY + headerHeight;

  txList.forEach((tx) => {
    doc.rect(20, currentY, 160, rowHeight);

    doc.setFontSize(7.5);
    doc.text(String(tx.method || "-"), 23, currentY + 3);
    doc.text(
      Number(tx.amount || 0).toLocaleString("en-IN"),
      155,
      currentY + 3
    );

    currentY += rowHeight;
  });
  doc.setTextColor(...primaryColor);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Amount:", centerX + 60, 65);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(60, 60, 60);
  doc.text(`Rs. ${Number(amount).toLocaleString("en-IN")}/-`, centerX + 90, 65);
  // === Extra spacing after table ===
  currentY += 6;


  // ================================
  //  REMARKS SECTION
  // ================================
  doc.setTextColor(...primaryColor);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Remarks:", 20, currentY);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  doc.text(remarks, 45, currentY, { maxWidth: 140 });

  currentY += 14;


  // Signature section
  doc.setFontSize(8);
  doc.setTextColor(...primaryColor);
  doc.setFont("helvetica", "bold");
  doc.text(`For ${academyName}`, 160, 125, { align: "center", maxWidth: 130 });

  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(0.5);
  doc.line(190, 128, 130, 128);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.text("Authorized Signatory", 160, 131, { align: "center" });

  doc.setFontSize(8);
  doc.setTextColor(...primaryColor);
  doc.setFont("helvetica", "bold");
  doc.text("Subject to Realisation of Cheque", 40, 125, { align: "center", maxWidth: 130 });

  doc.setTextColor(80, 80, 80);
  doc.setFontSize(6);
  doc.text(
    "This is a computer-generated receipt and does not require a physical signature.",
    centerY,
    135,
    { align: "center", maxWidth: 130 }
  );
  // Terms and conditions
  doc.setFontSize(5);
  doc.setTextColor(120, 120, 120);
  doc.text("* Terms & Conditions Apply", 10, 133);
  doc.text("* Please retain this receipt for future reference", 10, 135, { align: "left", maxWidth: 60 });


  const pdfPath = path.join(outputDir, `${rc_no}.pdf`);
  doc.save(pdfPath);
  const dt12 = new Receipts({
    receipt_no: rc_no,
    received_from: receivedFrom,
    amount,
    amount_in_word: amountInWords,
    description: remarks,
    roll_no,
    transactions,
    file_name: `${rc_no}.pdf`,
    date: new Date(receiptDate),

  })
  await dt12.save();
  // === Optional DB Save ===

  console.log(`Dynamic Receipt Generated: ${pdfPath}`);
  return rc_no;
}

// Export
module.exports = { generateDynamicReceipt };