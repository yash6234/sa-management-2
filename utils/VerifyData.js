const CryptoJS = require('crypto-js');
const axios = require('axios');
require('dotenv').config();
const {logger}=require('./enc_dec_admin')
// AES Encryption
const encryptData = (data) => {
  return CryptoJS.AES.encrypt(
    JSON.stringify(data),
    process.env.ENCRYPTION_SECRET_VERIFY
  ).toString();
};

// AES Decryption
const decryptData = (encryptedData) => {
  const bytes = CryptoJS.AES.decrypt(encryptedData, process.env.ENCRYPTION_SECRET_VERIFY);
  return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
};

// Main function
const VerifySA = async (dataObject) => {
  const encrypted = encryptData(dataObject);
  const encoded = encodeURIComponent(encrypted);
  const url = process.env.VERIFY_API;
  const apiUrl = `${url}/sa/api/sports-academy/get-academy/${encoded}`;

  logger.info(`➡️ Requesting API with URL: ${apiUrl}`);

  try {
    const response = await axios.get(apiUrl, {
      headers: {
        Origin: dataObject.borigin
      }
    });

    if (response.data?.data) {
      const decrypted = decryptData(response.data.data);
      // console.log('🔓 Decrypted Response Data:', decrypted);
      return decrypted;
    } else {
      logger.warn('ℹ️ No encrypted data in response.');
      return response.data;
    }
  } catch (err) {
    logger.error(`❌ API call failed:${err.response?.data || err.message}`);
    return null;
  }
};

module.exports={VerifySA,encryptData,decryptData}