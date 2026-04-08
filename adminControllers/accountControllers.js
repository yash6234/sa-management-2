const {logger, decryptData,encryptData} = require("../utils/enc_dec_admin");
const {validateAdminRequest} = require("../middlewares/adminValidation");
const Accounts = require("../models/Accounts");

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

// =======================================================
// ADD NEW RECEIPT
// =======================================================
const AddTransaction = async (req, res) => {
    try {
        logger.info("Add New Transaction   Request Received");

        const result = await validateAdminRequest(req, res);
                if (result.error) return res.status(result.status).json({ success: false, message: result.message });


        let decryptedData;
        try {
            decryptedData = decryptData(req.params.data);
        } catch (err) {
            logger.error("Decryption Failed", err);
                        return res.status(400).json({ success: false, message: "Invalid data" });

        }

        const {amt_in_out, amount, description, payment_method, date } = decryptedData;


        logger.info(`Transaction Added Successfully`);

        const ndt = new Accounts({
            amt_in_out: amt_in_out,
            amount: amount,
            description: description,
            payment_method,
            date:date||Date.now(),
            amount_in_word: numberToWords(Number(amount) || 0),
        })
        await ndt.save()

        return res.status(200).json({
            success: true,
            message: "Transaction Added Successfully",
            data: encryptData(ndt),
        });

    } catch (err) {
        logger.error("AddTransaction Error", err);
                return res.status(500).json({ success: false, message: "SERVER ERROR" });

    }
};

const FetchTransaction = async (req, res) => {
    try {
        logger.info('Fetch Transactions Request Received');

        const result = await validateAdminRequest(req, res);
        if (result.error) {
            return res.status(result.status).json({ success: false, message: result.message });
        }

        let decryptedData;
        try {
            decryptedData = decryptData(req.params.data);
        } catch (error) {
            logger.error(`Decryption failed: ${error.message}`);
                        return res.status(400).json({ success: false, message: "Invalid data" });

        }

        logger.info("User Verified Successfully");

        const { page } = decryptedData;
        const limit = 50;
        const skip = (parseInt(page) - 1) * limit;

        // Count Total
        const total = await Accounts.countDocuments({
            delete: false,
            active: true,
        });

        // Fetch Paginated Data
        const dt = await Accounts.find({
            delete: false,
            active: true,
        })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // ---------- EXTRA FILTER INFO ---------- //

        // 1️⃣ Payment Methods
        const payment_methods = await Accounts.distinct("payment_method", {
            delete: false,
            active: true,
        });

        // 2️⃣ Amount types (IN/OUT) always fixed from schema
        const amount_types = ["IN", "OUT"];

        // 3️⃣ Date Range
        const dateData = await Accounts.aggregate([
            { $match: { delete: false, active: true } },
            {
                $group: {
                    _id: null,
                    min_date: { $min: "$date" },
                    max_date: { $max: "$date" },
                }
            }
        ]);

        const min_date = dateData?.[0]?.min_date || null;
        const max_date = dateData?.[0]?.max_date || null;

        // 4️⃣ Amount Range
        const amountData = await Accounts.aggregate([
            { $match: { delete: false, active: true } },
            {
                $group: {
                    _id: null,
                    min_amount: { $min: "$amount" },
                    max_amount: { $max: "$amount" },
                }
            }
        ]);

        const min_amount = amountData?.[0]?.min_amount || 0;
        const max_amount = amountData?.[0]?.max_amount || 0;

        // 5️⃣ Unique Identifications (optional filters)
        const identifications = await Accounts.distinct("identification", {
            delete: false,
            active: true,
        });

        // --------------------------------------- //

        return res.status(200).json({
            success: true,
            message: "Transactions Fetched Successfully",
            data: encryptData({
                receipts: dt,
                pagination: {
                    total: total,
                    current_page: Number(page),
                    total_pages: Math.ceil(total / limit),
                    per_page: limit,
                },
                filters: {
                    amount_types,
                    payment_methods,
                    identifications,
                    date_range: { min_date, max_date },
                    amount_range: { min_amount, max_amount },
                }
            }),
        });

    } catch (err) {
        logger.error(`FetchTransaction Error : ${err}`);
                return res.status(500).json({ success: false, message: 'SERVER ERROR' });

    }
};

const DeleteTransaction = async (req, res) => {
    try{
        logger.info(`Delete Transaction Request Received`);
        const result = await validateAdminRequest(req, res);
        if (result.error) {
            return res.status(result.status).json({ success: false, message: result.message });
        }
        let decryptedData;
        try {
            decryptedData = decryptData(req.params.data);
        } catch (error) {
            logger.error(`Decryption failed: ${error.message}`);
                        return res.status(400).json({ success: false, message: "Invalid data" });

        }
        logger.info("User Verified Successfully");
        const { transaction_id }=decryptedData;

        const dt = await Accounts.findById(transaction_id);
        if(!dt){
            logger.error('Transaction not found');
            return res.status(404).json({message:"Transaction Not Found"})
        }
        dt.delete=true;
        dt.active=false;
        await dt.save();
        logger.info("Transaction Deleted Successfully")
                return res.status(200).json({ success: true, message:'Transaction Deleted Successfully', data: null });

    } catch (err){
        logger.error(`DeleteTransaction Error : ${err}`);
                return res.status(500).json({ success: false, message: 'SERVER ERROR' });

    }
}

const SearchTransaction = async (req, res) => {
    try {
        const result = await validateAdminRequest(req, res);
        if (result.error)
            return res.status(result.status).json({ message: result.message });

        // Decrypt input
        let decryptedData;
        try {
            decryptedData = decryptData(req.params.data);
        } catch (err) {
            return res.status(400).json({ message: "Invalid data" });
        }

        const {
            keyword,
            amount_type,
            payment_method,
            identification,
            from_date,
            to_date,
            min_amount,
            max_amount,
            page
        } = decryptedData;

        const limit = 50;
        const skip = (parseInt(page || 1) - 1) * limit;

        // ---------------------------------------------------------
        // BUILD QUERY
        // ---------------------------------------------------------
        const query = {
            delete: false,
            active: true,
        };

        const andConditions = [];

        // 🔍 Keyword Search
        if (keyword && keyword.trim() !== "") {
            const regex = new RegExp(keyword, "i");
            andConditions.push({
                $or: [
                    { identification: regex },
                    { description: regex },
                    { payment_method: regex },
                    { amt_in_out: regex },
                    { amount: !isNaN(Number(keyword)) ? Number(keyword) : null }
                ]
            });
        }

        // 🔍 Filter: Amount Type (IN/OUT)
        if (amount_type) {
            andConditions.push({ amt_in_out: amount_type });
        }

        // 🔍 Filter: Payment Method
        if (payment_method) {
            andConditions.push({ payment_method });
        }

        // 🔍 Filter: Identification Type
        if (identification) {
            andConditions.push({ identification });
        }

        // 🔍 Filter: Date Range
        if (from_date || to_date) {
            const dateFilter = {};
            if (from_date) dateFilter.$gte = new Date(from_date);
            if (to_date) dateFilter.$lte = new Date(to_date);
            andConditions.push({ date: dateFilter });
        }

        // 🔍 Filter: Amount Range
        if (min_amount || max_amount) {
            const amtFilter = {};
            if (min_amount) amtFilter.$gte = Number(min_amount);
            if (max_amount) amtFilter.$lte = Number(max_amount);
            andConditions.push({ amount: amtFilter });
        }

        if (andConditions.length > 0) {
            query.$and = andConditions;
        }

        // ---------------------------------------------------------
        // SEARCH + PAGINATION
        // ---------------------------------------------------------

        const total = await Accounts.countDocuments(query);

        const results = await Accounts.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        return res.status(200).json({
            success: true,
            message: "Search Success",
            data: encryptData({
                results,
                pagination: {
                    total,
                    current_page: Number(page || 1),
                    total_pages: Math.ceil(total / limit),
                    per_page: limit
                }
            }),
        });

    } catch (err) {
        logger.error("SearchTransaction Error", err);
                return res.status(500).json({ success: false, message: "SERVER ERROR" });

    }
};



module.exports = { AddTransaction, FetchTransaction, SearchTransaction, DeleteTransaction }