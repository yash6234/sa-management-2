const Academy = require("../models/Academy");
const AcademySports = require("../models/AcademySports");
const AcademySessions = require("../models/AcademySessions");
const { encryptData, decryptData ,logger} = require("../utils/enc_dec_admin");
const {validateAdminRequest} = require("../middlewares/adminValidation");
const SportsAcademy = require("../models/SportsAcademy");
require('dotenv').config();

const AddAcademySession = async (req, res) => {
    try{
        logger.info('Adding New Academy Session Request Received');
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
        const {name,session_from,session_to,academy_id}=decryptedData;
        const acad = await Academy.findById(academy_id);
        if(!acad){
            logger.error(`Academy Not Found With this ID : ${academy_id}`)
            return res.status(404).json({message:"Academy not found"})
        }
        const adt = new AcademySessions({
            name,academy:acad._id,academy_name:acad.name,session_from,session_to
        })
        await adt.save()
        logger.info(`New Session Created Successfully - ${name} added successfully`)

                return res.status(200).json({ success: true, message:'Session Created Successfully', data: null });

    } catch (err){
        logger.error(`AddAcademySession Error : ${err}`);
        return res.status(500).json({message:'SERVER ERROR'})
    }
}

const ViewAcademySession = async (req, res) => {
    try{
        logger.info('View All Academy Sessions Request Received');
        const result = await validateAdminRequest(req, res);
        if (result.error) {
            return res.status(result.status).json({ message: result.message });
        }
        const dt = await AcademySessions.find({active:true,delete:false});
        logger.info("Academy Sessions Fetched and Sent Successfully")
                return res.status(200).json({ success: true, message:'Academy Sessions Fetched Successfully', data:encryptData(dt) });

    } catch (err){
        logger.error(`ViewAcademySession Error : ${err}`);
        return res.status(500).json({message:'SERVER ERROR'})
    }
}

const ViewAllAcademySession = async (req, res) => {
    try{
        logger.info('View All Academy Sessions Request Received');
        const result = await validateAdminRequest(req, res);
        if (result.error) {
            return res.status(result.status).json({ message: result.message });
        }
        const dt = await AcademySessions.find({delete:false});
        logger.info("Academy Sessions Fetched and Sent Successfully")
                return res.status(200).json({ success: true, message:'Academy Sessions Fetched Successfully', data:encryptData(dt) });

    } catch (err){
        logger.error(`ViewAllAcademySession Error : ${err}`);
        return res.status(500).json({message:'SERVER ERROR'})
    }
}

const EditAcademySession = async (req, res) => {
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
        const {id,active,name,academy_id,session_from,session_to}=decryptedData;
        const existingAcademy = await AcademySessions.findById(id);
        if (!existingAcademy) {
            logger.error('Academy Sessions Not Found')
            return res.status(404).json({ message: "AcademySessions not found" });
        }
        let updatedFields = {};
        if (name && name !== existingAcademy.name) updatedFields.name = name;
        if (session_from && session_from !== existingAcademy.session_from) updatedFields.session_from = session_from;
        if (active && active !== existingAcademy.active) updatedFields.active = active;
        if (session_to && session_to !== existingAcademy.session_to) updatedFields.session_to = session_to;
        const existingAcademy1 = await Academy.findById(academy_id);
        if (!existingAcademy1) {
            logger.error('Academy Not Found')
            return res.status(404).json({ message: "Academy not found" });
        }
        if (existingAcademy1.name && existingAcademy1.name !== existingAcademy.academy_name) updatedFields.academy_name = existingAcademy1.name;
        if (existingAcademy1._id && existingAcademy1._id !== existingAcademy.academy) updatedFields.academy = existingAcademy1._id;

        await AcademySessions.findByIdAndUpdate(id, updatedFields, { new: true });
        logger.info("AcademySessions updated successfully");
                return res.status(200).json({ success: true, message: "Academy Session updated successfully", data: null });

    } catch (err){
        logger.error(`EditAcademySessions Error : ${err}`);
        return res.status(500).json({message:'SERVER ERROR'})
    }
}

const DeleteAcademySession = async (req, res) => {
    try{
        logger.info('Delete Academy Sessions Request Received');
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
        const adt = await AcademySessions.findById(id);
        if(!adt){
            logger.info('AcademySessions Not Found')
            return res.status(401).json({message:'Not Found'});
        }
        adt.delete = true;
        await adt.save();
        logger.info(`Successfully Deleted ${adt.name}`)
                return res.status(200).json({ success: true, message:`Session Deleted Successfully : ${adt.name}`, data: null })

    } catch (err){
        logger.error(`DeleteAcademySession Error : ${err}`);
        return res.status(500).json({message:'SERVER ERROR'})
    }
}

module.exports = {AddAcademySession,EditAcademySession,ViewAllAcademySession,ViewAcademySession,DeleteAcademySession}