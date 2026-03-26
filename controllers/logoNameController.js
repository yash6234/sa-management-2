const Setting = require('../models/Setting');
const { encryptData, decryptData ,verifyRecaptcha,logger} = require("../utils/enc_dec_c");
const path = require("path");
const fs = require("fs");

const FetchName = async (req, res) => {
    try{
        logger.info("Fetching Name of The Academy")
        const adt = await Setting.findOne({field:"academy_name"});
        if(!adt){
            logger.info("Name Not Found");
            return res.status(200).json({data:encryptData('Acade 360')})
        }
        logger.info(`Found Name : ${adt.value}`);
        return res.status(200).json({data:encryptData(adt.value)})
    } catch (err){
        logger.error("Error Fetching Name : ",err);
        return res.status(500).send("SERVER ERROR");
    }
}

const LogoName = async (req, res) => {
    try{
        logger.info("Logo File Name of The Academy")
        const adt = await Setting.findOne({field:"logo"});
        if(!adt){
            logger.info("Logo File Name Not Found");
            return res.status(200).json({data:encryptData('logo2.jpg')})
        }
        logger.info(`Found Name : ${adt.value}`);
        return res.status(200).json({data:encryptData(adt.value)})
    } catch (err){
        logger.error("Error Fetching Logo File Name : ",err);
        return res.status(500).send("SERVER ERROR");
    }
}

const ChangeLogo = async (req, res) => {
    try{
        logger.info("Changing Logo of The Academy")

        const files = req.files || {};

    // Folder where multer saved files
        const uploadPath = path.join(__dirname, '../Logo/');

        // Rename photo file if exists
        let photo = null;
        let newName
        let newPath
        try {
          if (files.photo && files.photo[0]) {
            const oldPath = files.photo[0].path;
            const ext = path.extname(files.photo[0].originalname).toLowerCase();
            newName = `logo${ext}`;
            newPath = path.join(uploadPath, newName);

            fs.renameSync(oldPath, newPath);
            photo = newName;
          }
        } catch (err) {
          logger.warn(`Photo upload failed or skipped for : ${err.message}`);
        }
        const ldt = await Setting.findOne({field:"logo"});
        if(!ldt){
            logger.info("Logo File Not Found! Creating New");
            const ldt1 = new Setting({
                field:'logo',
                value:newName
            })
            await ldt1.save();
        }
        else {
            ldt.value = newName;
            await ldt.save()
        }
        return res.status(200).json({message:'Logo Changed Successfully'})
    } catch (err){
        logger.error("Error Changing Logo : ",err);
        return res.status(500).send("SERVER ERROR");
    }
}

module.exports = { FetchName,ChangeLogo,LogoName};
