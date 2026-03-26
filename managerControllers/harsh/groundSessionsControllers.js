const Ground = require("../../models/Ground");
const GroundSessions = require("../../models/GroundSessions");
const { encryptData, decryptData ,logger} = require("../../utils/enc_dec_m");
const {validateManagerRequest} = require("../../middlewares/managerValidation");

require('dotenv').config();

const AddGroundSession = async (req, res) => {
    try{
        logger.info('Adding New Ground Session Request Received');
        const result = await validateManagerRequest(req, res);
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
        const {name,time_from,time_to,ground_id}=decryptedData;
        const acad = await Ground.findById(ground_id);
        if(!acad){
            logger.error(`Ground Not Found With this ID : ${ground_id}`)
            return res.status(404).json({message:"Ground not found"})
        }
        const adt = new GroundSessions({
            name,time_from,time_to,ground:acad._id,ground_name:acad.name,
        })
        await adt.save()
        logger.info(`New Ground Session Created Successfully - ${name} added successfully`)

        return res.status(200).json({message:'Ground Session Created Successfully'});
    } catch (err){
        logger.error(`AddGroundSession Error : ${err}`);
        return res.status(500).json({message:'SERVER ERROR'})
    }
}

const ViewGroundSession = async (req, res) => {
    try{
        logger.info('View All Ground Sessions Request Received');
        const result = await validateManagerRequest(req, res);
        if (result.error) {
            return res.status(result.status).json({ message: result.message });
        }
        const dt = await GroundSessions.find({active:true,delete:false});
        logger.info("Ground Sessions Fetched and Sent Successfully")
        return res.status(200).json({message:'Ground Sessions Fetched Successfully',data:encryptData(dt)});
    } catch (err){
        logger.error(`ViewGroundSession Error : ${err}`);
        return res.status(500).json({message:'SERVER ERROR'})
    }
}

const ViewAllGroundSession = async (req, res) => {
    try{
        logger.info('View All Ground Sessions Request Received');
        const result = await validateManagerRequest(req, res);
        if (result.error) {
            return res.status(result.status).json({ message: result.message });
        }
        const dt = await GroundSessions.find({delete:false});
        logger.info("Ground Sessions Fetched and Sent Successfully")
        return res.status(200).json({message:'Ground Sessions Fetched Successfully',data:encryptData(dt)});
    } catch (err){
        logger.error(`ViewAllGroundSession Error : ${err}`);
        return res.status(500).json({message:'SERVER ERROR'})
    }
}

const EditGroundSession = async (req, res) => {
    try{
        logger.info('Edit Ground Sports Request Received');
        const result = await validateManagerRequest(req, res);
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
        const {id,active,name,ground_id,time_to,time_from}=decryptedData;
        const existingGround = await GroundSessions.findById(id);
        if (!existingGround) {
            logger.error('Ground Sessions Not Found')
            return res.status(404).json({ message: "GroundSessions not found" });
        }
        let updatedFields = {};
        if (name && name !== existingGround.name) updatedFields.name = name;
        if (time_from && time_from !== existingGround.time_from) updatedFields.time_from = time_from;
        if (active && active !== existingGround.active) updatedFields.active = active;
        if (time_to && time_to !== existingGround.time_to) updatedFields.time_to = time_to;
        const existingGround1 = await Ground.findById(ground_id);
        if (!existingGround1) {
            logger.error('Ground Not Found')
            return res.status(404).json({ message: "Ground not found" });
        }
        if (existingGround1.name && existingGround1.name !== existingGround.ground_name) updatedFields.ground_name = existingGround1.name;
        if (existingGround1._id && existingGround1._id !== existingGround.ground) updatedFields.ground = existingGround1._id;

        await GroundSessions.findByIdAndUpdate(id, updatedFields, { new: true });
        logger.info("GroundSessions updated successfully");
        return res.status(200).json({ message: "Ground Session updated successfully" });
    } catch (err){
        logger.error(`EditGroundSessions Error : ${err}`);
        return res.status(500).json({message:'SERVER ERROR'})
    }
}

const DeleteGroundSession = async (req, res) => {
    try{
        logger.info('Delete Ground Sessions Request Received');
        const result = await validateManagerRequest(req, res);
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
        const adt = await GroundSessions.findById(id);
        if(!adt){
            logger.info('GroundSessions Not Found')
            return res.status(401).json({message:'Not Found'});
        }
        adt.delete = true;
        await adt.save();
        logger.info(`Ground Session Successfully Deleted ${adt.name}`)
        return res.status(200).json({message:`Ground Session Deleted Successfully : ${adt.name}`})
    } catch (err){
        logger.error(`DeleteGroundSession Error : ${err}`);
        return res.status(500).json({message:'SERVER ERROR'})
    }
}

module.exports = {AddGroundSession,EditGroundSession,
    ViewAllGroundSession,ViewGroundSession,DeleteGroundSession}
