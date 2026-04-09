const Academy = require("../models/Academy");
const AcademySports = require("../models/AcademySports");
const { encryptData, decryptData ,logger} = require("../utils/enc_dec_admin");
const {validateAdminRequest} = require("../middlewares/adminValidation");
const SportsAcademy = require("../models/SportsAcademy");
require('dotenv').config();

const AddAcademySports = async (req, res) => {
    try{
        logger.info('Adding New Academy Sports Request Received');
        const result = await validateAdminRequest(req, res);
        if (result.error) {
                        return res.status(result.status).json({ success: false, message: result.message });

        }
        let decryptedData;
        try {
            decryptedData = decryptData(req.params.data);
        } catch (error) {
            logger.error(`Decryption failed: ${error.message}`);
            return res.status(400).json({ message: "Invalid data" });
        }
        logger.info("User Verified Successfully");
        const {name,academy_id}=decryptedData;
        const acad = await Academy.findById(academy_id);
        if(!acad){
            logger.error(`Academy Not Found With this ID : ${academy_id}`)
            return res.status(404).json({message:"Academy not found"})
        }
        const adt = new AcademySports({
            name,academy:acad._id,academy_name:acad.name
        })
        await adt.save()
        logger.info(`New Sports Created Successfully - ${name} added successfully`)

                return res.status(200).json({ success: true, message:'Sports Created Successfully', data: null });

    } catch (err){
        logger.error(`AddAcademySports Error : ${err}`);
        return res.status(500).json({message:'SERVER ERROR'})
    }
}

const ViewAcademySports = async (req, res) => {
    try{
        logger.info('View All Academy Sports Request Received');
        const result = await validateAdminRequest(req, res);
        if (result.error) {
            return res.status(result.status).json({ message: result.message });
        }
        const dt = await AcademySports.find({active:true,delete:false});
        logger.info("Academy Sports Fetched and Sent Successfully")
                return res.status(200).json({ success: true, message:'Academy Sports Fetched Successfully', data:encryptData(dt) });

    } catch (err){
        logger.error(`ViewAcademySports Error : ${err}`);
        return res.status(500).json({message:'SERVER ERROR'})
    }
}

const ViewAllAcademySports = async (req, res) => {
    try{
        logger.info('View All Academy Sports Request Received');
        const result = await validateAdminRequest(req, res);
        if (result.error) {
            return res.status(result.status).json({ message: result.message });
        }
        const dt = await AcademySports.find({delete:false});
        logger.info("Academy Sports Fetched and Sent Successfully")
                return res.status(200).json({ success: true, message:'Academy Sports Fetched Successfully', data:encryptData(dt) });

    } catch (err){
        logger.error(`ViewAcademySports Error : ${err}`);
        return res.status(500).json({message:'SERVER ERROR'})
    }
}

const   EditAcademySports = async (req, res) => {
    try{
        logger.info('Edit Academy Sports Request Received');
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
        const {id,active,name,academy_id}=decryptedData;
        const existingAcademy = await AcademySports.findById(id);
        if (!existingAcademy) {
            logger.error('AcademySports Not Found')
            return res.status(404).json({ message: "AcademySports not found" });
        }
        let updatedFields = {};
        if (name && name !== existingAcademy.name) updatedFields.name = name;
        if (active && active !== existingAcademy.active) updatedFields.active = active;
        const existingAcademy1 = await Academy.findById(academy_id);
        if (!existingAcademy1) {
            logger.error('Academy Not Found')
            return res.status(404).json({ message: "Academy not found" });
        }
        if (existingAcademy1.name && existingAcademy1.name !== existingAcademy.academy_name) updatedFields.academy_name = existingAcademy1.name;
        if (existingAcademy1._id && existingAcademy1._id !== existingAcademy.academy) updatedFields.academy = existingAcademy1._id;

        await AcademySports.findByIdAndUpdate(id, updatedFields, { new: true });
        logger.info("AcademySports updated successfully");
                return res.status(200).json({ success: true, message: "Academy updated successfully", data: null });

    } catch (err){
        logger.error(`EditAcademySports Error : ${err}`);
        return res.status(500).json({message:'SERVER ERROR'})
    }
}

const DeleteAcademySports = async (req, res) => {
    try{
        logger.info('Delete AcademySports Request Received');
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
        logger.info("User Verified Successfully");
        const {id}=decryptedData;
        const adt = await AcademySports.findById(id);
        if(!adt){
            logger.info('AcademySports Not Found')
            return res.status(401).json({message:'Not Found'});
        }
        adt.delete = true;
        await adt.save();
        logger.info(`Successfully Deleted ${adt.name}`)
                return res.status(200).json({ success: true, message:`Sports Deleted Successfully : ${adt.name}`, data: null })

    } catch (err){
        logger.error(`DeleteAcademySports Error : ${err}`);
        return res.status(500).json({message:'SERVER ERROR'})
    }
}

module.exports = {AddAcademySports,EditAcademySports,ViewAcademySports,DeleteAcademySports,ViewAllAcademySports}