const Accounts = require('../models/Accounts');
const {logger} = require('./enc_dec_admin');
const res = require("express/lib/response");
const Academy = require("../models/Academy");

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

const AddTransaction = async (amount, in_out, description, identification = '', method = 'CASH') => {
    try {
        logger.info(`Adding transaction... Amount: ${amount}, Type: ${in_out}, Method: ${method}`);

        if (!['IN', 'OUT'].includes(in_out)) {
            logger.warn(`Invalid transaction type: ${in_out}`);
            throw new Error("Invalid transaction type. Use 'IN' or 'OUT'.");
        }
        if(amount>0) {
            const newTransaction = new Accounts({
                amt_in_out: in_out,
                amount,
                amount_in_word: numberToWords(Number(amount) || 0),
                description,
                identification,
                payment_method:method
            });

            await newTransaction.save();
            logger.info("Transaction added successfully.");
            return newTransaction;
        }
        else{
            logger.info("Transaction of Rs.0");
            return "Transaction added successfully";
        }
    } catch (error) {
        logger.error(`Error adding transaction: ${error.message}`);
        throw new Error("Error adding transaction");
    }
};

const AddTransactionAdmin = async (
  date,
  amount,
  in_out,
  description,
  identification = '',
  method = 'CASH',
  options = {}       // <-- receives { session }
) => {
  try {
    logger.info(`Adding transaction Admin... Date: ${date} Amount: ${amount}, Type: ${in_out}, Method: ${method}`);

    if (!['IN', 'OUT'].includes(in_out)) {
      throw new Error("Invalid transaction type. Use 'IN' or 'OUT'.");
    }

    if (amount > 0) {
      const newTransaction = new Accounts({
        amt_in_out: in_out,
        amount,
        amount_in_word: numberToWords(Number(amount) || 0),
        description,
        date,
        identification,
        payment_method: method
      });

      await newTransaction.save(options);  // <-- important
      logger.info("Transaction added successfully.");
      return newTransaction;
    } else {
      logger.info("Transaction of Rs.0");
      return "Transaction added successfully";
    }

  } catch (error) {
    logger.error(`Error adding transaction: ${error.message}`);
    throw new Error("Error adding transaction");
  }
};


module.exports = { AddTransaction, AddTransactionAdmin};
