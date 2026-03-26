const Academy = require("../models/Academy");
const AcademySports = require("../models/AcademySports");
const AcademyPlans = require("../models/AcademyPlans");
const AcademySessions = require("../models/AcademySessions");
const { encryptData, decryptData ,logger} = require("../utils/enc_dec_admin");
const {validateAdminRequest} = require("../middlewares/adminValidation");
const SportsAcademy = require("../models/SportsAcademy");
require('dotenv').config();

const AddAcademyPlan = async (req, res) => {
    try{
        logger.info('Adding New Academy Plan Request Received');
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
        const {name,session_id,sports_id,registration_fee,amount,days,academy_id}=decryptedData;

        const acad = await Academy.findById(academy_id);
        if (!acad) {
            logger.error(`Academy Not Found With this ID : ${academy_id}`);
            return res.status(404).json({ message: "Academy not found" });
        }

        const sport = await AcademySports.findById(sports_id);
        if (!sport || !sport.academy.equals(acad._id)) {
            logger.error(`Sport Not Found With this ID : ${sports_id}`);
            return res.status(404).json({ message: "Sport not found" });
        }

        const session = await AcademySessions.findById(session_id);
        if (!session || !session.academy.equals(acad._id)) {
            logger.error(`Session Not Found With this ID : ${session_id}`);
            return res.status(404).json({ message: "Session not found" });
        }


        const adt = new AcademyPlans({
            name,registration_fee,amount,days,session_id:session._id,
            session_time_from:session.session_from,
            session_time_to:session.session_to,
            academy:acad._id,
            academy_name:acad.name,
            sports:sport._id,
            sports_name:sport.name,
        })
        await adt.save()
        logger.info(`New Plan Created Successfully - ${name} added successfully`)

        return res.status(200).json({message:'Plan Created Successfully'});
    } catch (err){
        logger.error(`AddAcademyPlan Error : ${err}`);
        return res.status(500).json({message:'SERVER ERROR'})
    }
}

const ViewAcademyPlan = async (req, res) => {
    try{
        logger.info('View All Academy Plans Request Received');
        const result = await validateAdminRequest(req, res);
        if (result.error) {
            return res.status(result.status).json({ message: result.message });
        }
        const dt = await AcademyPlans.find({active:true,delete:false}).populate('session_id academy sports');
        logger.info("Academy Plans Fetched and Sent Successfully")
        return res.status(200).json({message:'Academy Plans Fetched Successfully',data:encryptData(dt)});
    } catch (err){
        logger.error(`ViewAcademyPlan Error : ${err}`);
        return res.status(500).json({message:'SERVER ERROR'})
    }
}

const ViewAllAcademyPlan = async (req, res) => {
    try{
        logger.info('View All Academy Plans Request Received');
        const result = await validateAdminRequest(req, res);
        if (result.error) {
            return res.status(result.status).json({ message: result.message });
        }
        const dt = await AcademyPlans.find({delete:false}).populate('session_id academy sports');
        logger.info("Academy Plans Fetched and Sent Successfully")
        return res.status(200).json({message:'Academy Plans Fetched Successfully',data:encryptData(dt)});
    } catch (err){
        logger.error(`ViewAllAcademyPlan Error : ${err}`);
        return res.status(500).json({message:'SERVER ERROR'})
    }
}

const EditAcademyPlan = async (req, res) => {
    try {
        logger.info('Edit Academy Sports Request Received');

        // Step 1: Validate Admin
        const result = await validateAdminRequest(req, res);
        if (result.error) {
            return res.status(result.status).json({ message: result.message });
        }

        // Step 2: Decrypt
        let decryptedData;
        try {
            decryptedData = decryptData(req.params.data);
        } catch (error) {
            logger.error(`Decryption failed: ${error.message}`);
            return res.status(400).json({ message: "Invalid data" });
        }

        logger.info("User Verified Successfully");

        const {
            id,
            active,
            name,
            academy_id,
            session_id,
            sports_id,
            registration_fee,
            amount,
            days
        } = decryptedData;

        // Step 3: Fetch existing plan
        const existingPlan = await AcademyPlans.findById(id);
        if (!existingPlan) {
            logger.error('Academy Plans Not Found');
            return res.status(404).json({ message: "AcademyPlans not found" });
        }

        let updatedFields = {};

        // Basic fields (only update if changed)
        if (name !== undefined && name !== existingPlan.name) updatedFields.name = name;
        if (registration_fee !== undefined && registration_fee !== existingPlan.registration_fee) updatedFields.registration_fee = registration_fee;
        if (amount !== undefined && amount !== existingPlan.amount) updatedFields.amount = amount;
        if (days !== undefined && days !== existingPlan.days) updatedFields.days = days;
        if (active !== undefined && active !== existingPlan.active) updatedFields.active = active;

        // Step 4: Validate & update academy
        const academyObj = await Academy.findById(academy_id);
        if (!academyObj) {
            logger.error('Academy Not Found');
            return res.status(404).json({ message: "Academy not found" });
        }

        if (!academyObj._id.equals(existingPlan.academy)) {
            updatedFields.academy = academyObj._id;
            updatedFields.academy_name = academyObj.name;
        }

        // Step 5: Validate & update session
        const sessionObj = await AcademySessions.findById(session_id);
        if (!sessionObj || !sessionObj.academy.equals(academyObj._id)) {
            logger.error('Session Not Found');
            return res.status(404).json({ message: "Session not found" });
        }

        if (!sessionObj._id.equals(existingPlan.session_id)) {
            updatedFields.session_id = sessionObj._id;
            updatedFields.session_time_from = sessionObj.session_from;
            updatedFields.session_time_to = sessionObj.session_to;
        }

        // Step 6: Validate & update sport
        const sportObj = await AcademySports.findById(sports_id);
        if (!sportObj  || !sportObj.academy.equals(academyObj._id)) {
            logger.error('Sport Not Found');
            return res.status(404).json({ message: "Sport not found" });
        }

        if (!sportObj._id.equals(existingPlan.sports)) {
            updatedFields.sports = sportObj._id;
            updatedFields.sports_name = sportObj.name;
        }

        // Step 7: Update
        await AcademyPlans.findByIdAndUpdate(id, updatedFields, { new: true });

        logger.info("AcademyPlans updated successfully");
        return res.status(200).json({ message: "Academy Plan updated successfully" });

    } catch (err) {
        logger.error(`EditAcademyPlans Error : ${err}`);
        return res.status(500).json({ message: 'SERVER ERROR' });
    }
};


const DeleteAcademyPlan = async (req, res) => {
    try{
        logger.info('Delete Academy Plans Request Received');
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
        const adt = await AcademyPlans.findById(id);
        if(!adt){
            logger.info('AcademyPlans Not Found')
            return res.status(401).json({message:'Not Found'});
        }
        adt.delete = true;
        await adt.save();
        logger.info(`Successfully Deleted ${adt.name}`)
        return res.status(200).json({message:`Plan Deleted Successfully : ${adt.name}`})
    } catch (err){
        logger.error(`DeleteAcademyPlan Error : ${err}`);
        return res.status(500).json({message:'SERVER ERROR'})
    }
}

module.exports = {AddAcademyPlan,EditAcademyPlan,ViewAllAcademyPlan,ViewAcademyPlan,DeleteAcademyPlan}