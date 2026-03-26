const Academy = require("../models/Academy");
const { encryptData, decryptData ,logger} = require("../utils/enc_dec_admin");
const {validateAdminRequest} = require("../middlewares/adminValidation");
const SportsAcademy = require("../models/SportsAcademy");
require('dotenv').config();

const AddAcademy = async (req, res) => {
    try{
        logger.info('Adding New Academy Request Received');
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
        const hdt = await SportsAcademy.findById(process.env.sport_sacademy_id);
        if(hdt.add_institute==false || !hdt.add_institute){
            logger.info(`Adding New Institute is Not Allowed For this ${hdt.name}`)
            return res.status(500).json({message: `Adding New Institute is Not Allowed For this ${hdt.name}`});
        }
        const {name,address,contact_no,contact_name}=decryptedData;
        const adt = new Academy({
            name,address,contact_name,contact_no
        })
        await adt.save()
        logger.info(`New Institute Created Successfully - ${name} added successfully`)

        return res.status(200).json({message:'Institute Created Successfully'});
    } catch (err){
        logger.error(`AddAcademy Error : ${err}`);
        return res.status(500).json({message:'SERVER ERROR'})
    }
}

const ViewAcademy = async (req, res) => {
    logger.debug('View All Academy Sports Request Received');
    try{
        logger.info('View All Academy Request Received');
        const result = await validateAdminRequest(req, res);
        if (result.error) {
            return res.status(result.status).json({ message: result.message });
        }
        const dt = await Academy.find({active:true,delete:false});
        logger.info("Academy Fetched and Sent Successfully")
        return res.status(200).json({message:'Academy Fetched Successfully',data:encryptData(dt)});
    } catch (err){
        logger.error(`ViewAcademy Error : ${err}`);
        return res.status(500).json({message:'SERVER ERROR'})
    }
}

const EditAcademy = async (req, res) => {
    try{
        logger.info('Edit Academy Request Received');
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
        const {id,active,name,address,contact_no,contact_name}=decryptedData;
        const existingAcademy = await Academy.findById(id);
        if (!existingAcademy) {
            logger.error('Academy Not Found')
            return res.status(404).json({ message: "Academy not found" });
        }
        let updatedFields = {};
        if (name && name !== existingAcademy.name) updatedFields.name = name;
        if (address && address !== existingAcademy.address) updatedFields.address = address;
        if (contact_no && contact_no !== existingAcademy.contact_no) updatedFields.contact_no = contact_no;
        if (contact_name && contact_name !== existingAcademy.contact_name) updatedFields.contact_name = contact_name;
        const hdt = await SportsAcademy.findById(process.env.sport_sacademy_id);

        if (!hdt || hdt.add_institute === false) {
            logger.info(`Cannot change 'active' status as it is not allowed for ${hdt?.name || "Unknown Academy"}`);
        } else {
            if (typeof active === "boolean" && active !== existingAcademy.active) {
                updatedFields.active = active;
            }
        }

        if (Object.keys(updatedFields).length === 0) {
            return res.status(200).json({ message: "No changes detected" });
        }

        await Academy.findByIdAndUpdate(id, updatedFields, { new: true });
        logger.info("Academy updated successfully");
        return res.status(200).json({ message: "Academy updated successfully" });
    } catch (err){
        logger.error(`EditAcademy Error : ${err}`);
        return res.status(500).json({message:'SERVER ERROR'})
    }
}

const DeleteAcademy = async (req, res) => {
    try{
        logger.info('Delete Academy Request Received');
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
        const hdt = await SportsAcademy.findById(process.env.sport_sacademy_id);
        if(hdt.add_institute==false || !hdt.add_institute){
            logger.info(`Deleting Institute is Not Allowed For ${hdt.name}`)
            return res.status(500).json({message: `Deleting Institute is Not Allowed For ${hdt.name}`});
        }
        logger.info("User Verified Successfully");
        const {id}=decryptedData;
        const adt = await Academy.findById(id);
        if(!adt){
            logger.info('Academy Not Found')
            return res.status(401).json({message:'Not Found'});
        }
        adt.delete = true;
        await adt.save();
        logger.info(`Successfully Deleted ${adt.name}`)
        return res.status(200).json({message:`Institute Deleted Successfully : ${adt.name}`})
    } catch (err){
        logger.error(`DeleteAcademy Error : ${err}`);
        return res.status(500).json({message:'SERVER ERROR'})
    }
}

module.exports = {AddAcademy,EditAcademy,DeleteAcademy,ViewAcademy}