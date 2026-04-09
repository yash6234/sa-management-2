const Ground = require("../models/Ground");
const { encryptData, decryptData ,logger} = require("../utils/enc_dec_admin");
const {validateAdminRequest, validateAdminRequestPost} = require("../middlewares/adminValidation");
const path = require("path");
const fs = require("fs");

require('dotenv').config();

function renameUploadedFile(oldPath, rollNo, fieldname) {
    if (!oldPath) return null;

    const uploadDir = "uploads/ground";

    const ext = path.extname(oldPath);
    const newName = `${rollNo}-${fieldname}${ext}`;
    const newPath = path.join(uploadDir, newName);

    try {
        fs.renameSync(path.join(uploadDir, oldPath), newPath);
        return newName;
    } catch (e) {
        console.log("Rename failed:", e);
        return oldPath;
    }
}
function sanitizeFileName(str) {
  return str
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '_')   // replace invalid chars with _
    .replace(/_+/g, '_')            // remove multiple underscores
    .replace(/^_+|_+$/g, '');       // trim underscores
}

const AddGround = async (req, res) => {
    try{
        logger.info('Adding New Ground Request Received');
        const result = await validateAdminRequestPost(req, res);
        if (result.error) {
                    return res.status(result.status).json({ success: false, message: result.message });

        }

        // 2) Decrypt payload
        let decryptedData;
        try {
          const fixedCipher = decodeURIComponent(req.body.data).replace(/ /g, '+');
          decryptedData = decryptData(fixedCipher);
        } catch (error) {
          logger.error(`Decryption failed: ${error.message}`);
                    return res.status(400).json({ success: false, message: "Invalid data" });

        }
        const { name,description } = decryptedData
        const images_old = Array.isArray(req.files?.images) ? req.files.images.map(f => f.filename) : [];

        const images = images_old.map((f, i) => renameUploadedFile(f,sanitizeFileName(name), `images${i}`));

        const adt = new Ground({
            name,description,images
        })
        await adt.save()
        logger.info(`New Ground Created Successfully - ${name} added successfully`)

                return res.status(200).json({ success: true, message:'Ground Created Successfully', data: null });

    } catch (err){
        logger.error(`AddGround Error : ${err}`);
        return res.status(500).json({message:'SERVER ERROR'})
    }
}

const ViewGround = async (req, res) => {
    logger.debug('View All Ground Request Received');
    try{
        const result = await validateAdminRequest(req, res);
        if (result.error) {
            return res.status(result.status).json({ message: result.message });
        }
        const dt = await Ground.find({active:true,delete:false});
        logger.info("Ground Fetched and Sent Successfully")
                return res.status(200).json({ success: true, message:'Ground Fetched Successfully', data:encryptData(dt) });

    } catch (err){
        logger.error(`ViewAcademy Error : ${err}`);
        return res.status(500).json({message:'SERVER ERROR'})
    }
}

const ViewAllGround = async (req, res) => {
    logger.debug('View All Ground Request Received');
    try{
        const result = await validateAdminRequest(req, res);
        if (result.error) {
            return res.status(result.status).json({ message: result.message });
        }
        const dt = await Ground.find({delete:false});
        logger.info("Ground Fetched and Sent Successfully")
                return res.status(200).json({ success: true, message:'Ground Fetched Successfully', data:encryptData(dt) });

    } catch (err){
        logger.error(`ViewAcademy Error : ${err}`);
        return res.status(500).json({message:'SERVER ERROR'})
    }
}

const EditGround = async (req, res) => {
  try {
    logger.info("Edit Ground Request Received");

    // 1) Validate Admin
    const result = await validateAdminRequestPost(req, res);
    if (result.error) {
      return res.status(result.status).json({ message: result.message });
    }

    // 2) Decrypt Payload
    let decryptedData;
    try {
      const fixedCipher = decodeURIComponent(req.body.data).replace(/ /g, "+");
      decryptedData = decryptData(fixedCipher);
    } catch (error) {
      logger.error("Decryption failed: " + error.message);
      return res.status(400).json({ message: "Invalid data" });
    }

    const { ground_id, name, description, removeImages = [] } = decryptedData;

    // 3) Fetch Ground
    const ground = await Ground.findById(ground_id);
    if (!ground) {
        logger.error(`Ground Not Found ${ground_id}`)
      return res.status(404).json({ message: "Ground not found" });
    }

    // 4) Remove Selected Old Images
    let updatedImages = [...ground.images];

    if (Array.isArray(removeImages) && removeImages.length > 0) {
      for (const img of removeImages) {
        updatedImages = updatedImages.filter(i => i !== img);

        // delete file from uploads folder
        try {
          fs.unlinkSync(path.join("uploads", img));
        } catch (e) {
          console.log("File already deleted or missing: ", img);
        }
      }
    }

    // 5) Handle Newly Uploaded Images
    const uploadedImages = Array.isArray(req.files?.images)
      ? req.files.images.map(f => f.filename)
      : [];

    const newRenamedImages = uploadedImages.map((f, i) =>
      renameUploadedFile(
        f,
        sanitizeFileName(name),
        `images${updatedImages.length + i}`
      )
    );

    // Combine Old + New Images
    const finalImages = [...updatedImages, ...newRenamedImages];

    // 6) Update Ground
    ground.name = name;
    ground.description = description;
    ground.images = finalImages;

    await ground.save();

    logger.info(`Ground Updated Successfully - ${name}`);

        return res.status(200).json({ success: true, message: "Ground Updated Successfully", data: null });

  } catch (err) {
    logger.error("EditGround Error: " + err);
    return res.status(500).json({ message: "SERVER ERROR" });
  }
};


const DeleteGround = async (req, res) => {
    try{
        logger.info('Delete Ground Request Received');
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
        const {id}=decryptedData;
        const adt = await Ground.findById(id);
        if(!adt || adt.delete==true){
            logger.info('Ground Not Found')
            return res.status(401).json({message:'Ground Not Found'});
        }
        adt.delete = true;
        await adt.save();
        logger.info(`Successfully Deleted ${adt.name}`)
                return res.status(200).json({ success: true, message:`Ground Deleted Successfully : ${adt.name}`, data: null })

    } catch (err){
        logger.error(`DeleteGround Error : ${err}`);
        return res.status(500).json({message:'SERVER ERROR'})
    }
}

module.exports = { AddGround, EditGround, ViewGround, DeleteGround , ViewAllGround}

