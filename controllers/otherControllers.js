const { encryptData, decryptData, VerifySA} = require("../utils/VerifyData");
const { logger} = require("../utils/enc_dec_m");

const fs = require('fs');
const path = require('path');
const Hostel = require("../models/SportsAcademy");
const Setting = require("../models/Setting");

function extractDomain(url) {
  try {
    const { hostname } = new URL(url.startsWith('http') ? url : `http://${url}`);
    if (!/^[a-zA-Z0-9.-]+$/.test(hostname)) throw new Error("Invalid hostname");
    return hostname;
  } catch (e) {
    return null; // or throw error
  }
}

const updateHostel = async () => {
  try {
    const dt = await VerifySA({
      hostel_id: process.env.sport_sacademy_id,
      origin: process.env.FRONTEND_DOMAIN,
      borigin: process.env.BACKEND_DOMAIN,
    });

    // console.log('✅ Verified Hostel Data:', dt);

    const hdt = await Hostel.findById(process.env.sport_sacademy_id);

    if (!hdt) {
      const d1 = new Hostel(dt);
      await d1.save();
      logger.info('🏠 New Academy saved.');
      const sdt = await Setting.findOne({field:'academy_name'});
      if (!sdt) {
        const sdt1 = new Setting({
          field:'academy_name',
          value:dt.name
        })
        await sdt1.save()
      }
      else{
        sdt.value=dt.name;
        await sdt.save();
      }
      const ldt = await Setting.findOne({field:'logo'});
      if (!ldt) {
        const ldt1 = new Setting({
          field:'logo',
          value:'logo.png'
        })
        await ldt1.save()
      }
    } else {
      const sdt = await Setting.findOne({field:'academy_name'});
      if (!sdt) {
        const sdt1 = new Setting({
          field:'academy_name',
          value:dt.name
        })
        await sdt1.save()
      }
      else{
        sdt.value=dt.name;
        await sdt.save();
      }
      const ldt = await Setting.findOne({field:'logo'});
      if (!ldt) {
        const ldt1 = new Setting({
          field:'logo',
          value:'logo.png'
        })
        await ldt1.save()
      }
      await Hostel.findByIdAndUpdate(process.env.sport_sacademy_id, dt, { new: true });
      logger.info('🔄 Academy updated.');
    }
  } catch (err) {
    logger.error('❌ Error in someFunction:', err.message);
  }
};

function updateEnvVariables(newVars) {
  const envPath = path.join(__dirname, '../.env');
  let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';

  const envLines = envContent.split('\n').filter(line => line.trim() !== '');
  const envMap = {};

  // Create a map from current .env
  for (let line of envLines) {
    const [key, ...val] = line.split('=');
    envMap[key] = val.join('=');
  }

  // Update with new values
  for (const key in newVars) {
    envMap[key] = newVars[key];
  }

  // Reconstruct content
  const updatedContent = Object.entries(envMap)
    .map(([key, val]) => `${key}=${val}`)
    .join('\n');

  fs.writeFileSync(envPath, updatedContent);
}

const UpdateAcademyIDSecurely = async (req, res) => {
  try {
    logger.info('UPDATING ACADEMY ID, DOMAIN AND BACKEND DOMAIN');

    let decryptedData;
    try {
      decryptedData = await decryptData(req.params.data);
    } catch (error) {
      logger.error('DECRYPTION ERROR:', error);
      return res.status(400).json({ message: 'Invalid encrypted data' });
    }

    const newEnvVars = {};

    if (decryptedData.sport_sacademy_id) newEnvVars.sport_sacademy_id = decryptedData.sport_sacademy_id;
    if (decryptedData.FRONTEND_DOMAIN) newEnvVars.FRONTEND_DOMAIN = extractDomain(decryptedData.FRONTEND_DOMAIN);
    if (decryptedData.BACKEND_DOMAIN) newEnvVars.BACKEND_DOMAIN = extractDomain(decryptedData.BACKEND_DOMAIN);

    await updateEnvVariables(newEnvVars);
    const dotenv = require('dotenv');
    await dotenv.config({ override: true });
    await updateHostel();
    logger.info('.env successfully updated');
    return res.json({ message: '.env updated successfully' });

  } catch (err) {
    logger.error('ERROR UPDATING ACADEMY ID:', err);
    return res.status(500).json({ message: 'SERVER ERROR' });
  }
};

module.exports= { UpdateAcademyIDSecurely};