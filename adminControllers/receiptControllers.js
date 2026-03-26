const {logger, decryptData,encryptData} = require("../utils/enc_dec_admin");
const {validateAdminRequest} = require("../middlewares/adminValidation");
const Accounts = require("../models/Accounts");
const AcademyAdmissions = require("../models/AcademyAdmissions");
const Receipts = require("../models/Receipts")
const Academy = require("../models/Academy")
const {generateDynamicReceipt} = require("../middlewares/receiptGenerator");
const {AddTransactionAdmin} = require("../utils/Trans_Fn");
// =======================================================
// ADD NEW RECEIPT
// =======================================================

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

const AddNewReceipt = async (req, res) => {
    let createdTransactions = [];

    try {
        logger.info("Add New Receipt Request Received");

        const result = await validateAdminRequest(req, res);
        if (result.error) return res.status(result.status).json({ message: result.message });

        let decryptedData;
        try {
            decryptedData = decryptData(req.params.data);
        } catch (err) {
            logger.error("Decryption Failed", err);
            return res.status(400).json({ message: "Invalid data" });
        }

        const { academy_id,name, remarks, transactions, roll_no } = decryptedData;

        // Validate Academy
        const academy = await Academy.findById(academy_id);
        if (!academy || academy.delete || !academy.active) {
            return res.status(404).json({ message: "Academy not found" });
        }

        const safeTransactions = Array.isArray(transactions) ? transactions : [];

        const totalAmount = safeTransactions.reduce(
            (sum, t) => sum + Number(t.amount || 0),
            0
        );

        // Save individual transactions in Accounts DB
        const finalTxList = [];

        for (const tr of safeTransactions) {
            const txDate = tr.date ? new Date(tr.date) : new Date();
            const txAmount = Number(tr.amount || 0);
            const txMethod = tr.method || "CASH";

            const savedTx = await AddTransactionAdmin(
                txDate,
                txAmount,
                "IN",
                roll_no,
                roll_no,
                txMethod
            );

            createdTransactions.push(savedTx._id);

            finalTxList.push({
                transaction_id: savedTx._id,
                amount: txAmount,
                method: txMethod,
                date: txDate,
            });
        }

        // Generate receipt number
        const receipt_no = await generateDynamicReceipt(academy._id, {
            roll_no,
            receivedFrom: name,
            amount: totalAmount,
            transactions: safeTransactions,
            remarks,
        });
        console.log(receipt_no);

        // Update Admission
        admission.transactions.push(finalTxList);
        await admission.save();

        logger.info(`Receipt Generated Successfully No: ${receipt_no}`);

        return res.status(200).json({
            message: "Receipt Created Successfully",
            data: encryptData({ receipt_no }),
        });

    } catch (err) {
        // ROLLBACK
        if (createdTransactions.length) {
            await Accounts.deleteMany({ _id: { $in: createdTransactions } });
            logger.warn("ROLLBACK: Transactions deleted");
        }

        logger.error("AddNewReceipt Error", err);
        return res.status(500).json({ message: "SERVER ERROR" });
    }
};

const FetchReceipts = async (req, res) => {
    try{
        logger.info('Fetch Receipts Request Received');
        const result = await validateAdminRequest(req, res);
        if (result.error) {
            return res.status(result.status).json({ message: result.message });
        }
        let decryptedData;
        try {
            decryptedData = decryptData(req.params.data);
        } catch (error) {
            logger.error(`Decryption failed: ${error.message}`);
            return res.status(400).json({ message: "Invalid data" });
        }
        logger.info("User Verified Successfully");
        const { page }=decryptedData;

        const limit = 50;
        const skip = (parseInt(page) - 1) * limit;

        const totalAdm = await Receipts.countDocuments({
          delete: false,
          active:true,
        });

        const dt = await Receipts.find({
          delete: false,
          active:true,
        })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean();

        logger.info(``)

        return res.status(200).json({
          message: "Receipts Fetched Successfully",
          data: encryptData({
            receipts: dt,
            pagination: {
              total: totalAdm,
              current_page: Number(page),
              total_pages: Math.ceil(totalAdm / limit),
              per_page: limit,
            },
          }),
        });
    } catch (err){

        logger.error(`FetchReceipts Error : ${err}`);
        return res.status(500).json({message:'SERVER ERROR'})
    }
}

const DeleteReceipt = async (req, res) => {
    try{
        logger.info(`Delete Receipt Request Received`);
        const result = await validateAdminRequest(req, res);
        if (result.error) {
            return res.status(result.status).json({ message: result.message });
        }
        let decryptedData;
        try {
            decryptedData = decryptData(req.params.data);
        } catch (error) {
            logger.error(`Decryption failed: ${error.message}`);
            return res.status(400).json({ message: "Invalid data" });
        }
        logger.info("User Verified Successfully");
        const { receipt_id }=decryptedData;

        const dt = await Receipts.findById(receipt_id);
        if(!dt){
            logger.error('Receipt not found');
            return res.status(404).json({message:"Receipt Not Found"})
        }
        dt.delete=true;
        dt.active=false;
        await dt.save();
        logger.info("Receipt Deleted Successfully")
        return res.status(200).json({message:'Receipt Deleted Successfully'});
    } catch (err){
        logger.error(`AddNewReceipt Error : ${err}`);
        return res.status(500).json({message:'SERVER ERROR'})
    }
}

const SearchReceipt = async (req, res) => {
    try {
        const result = await validateAdminRequest(req, res);
        if (result.error) return res.status(result.status).json({ message: result.message });

        let decryptedData;
        try {
            decryptedData = decryptData(req.params.data);
        } catch (err) {
            return res.status(400).json({ message: "Invalid data" });
        }

        const { keyword } = decryptedData;

        const query = {
            delete: false,
            active: true,
            $or: [
                { receipt_no: { $regex: keyword, $options: "i" } },
                { roll_no: { $regex: keyword, $options: "i" } },
                { received_from: { $regex: keyword, $options: "i" } },
            ]
        };

        const receipts = await Receipts.find(query).sort({ createdAt: -1 });

        return res.status(200).json({
            message: "Search Success",
            data: encryptData(receipts),
        });

    } catch (err) {
        logger.error("SearchReceipt Error", err);
        return res.status(500).json({ message: "SERVER ERROR" });
    }
};


module.exports = { AddNewReceipt, FetchReceipts, DeleteReceipt, SearchReceipt }