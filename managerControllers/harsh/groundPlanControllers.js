const Ground = require("../../models/Ground");
const GroundPlans = require("../../models/GroundPlans");
const GroundSessions = require("../../models/GroundSessions");
const { encryptData, decryptData ,logger} = require("../../utils/enc_dec_m");
const {validateManagerRequest} = require("../../middlewares/managerValidation");

require('dotenv').config();

const AddGroundPlan = async (req, res) => {
    try{
        logger.info('Adding New Ground Plan Request Received');
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
        const {name,session_id,amount,ground_id,hours}=decryptedData;

        const acad = await Ground.findById(ground_id);
        if (!acad) {
            logger.error(`Ground Not Found With this ID : ${ground_id}`);
            return res.status(404).json({ message: "Ground not found" });
        }

        const session = await GroundSessions.findById(session_id);
        if (!session || !session.ground.equals(acad._id)) {
            logger.error(`Session Not Found With this ID : ${session_id}`);
            return res.status(404).json({ message: "Session not found" });
        }


        const adt = new GroundPlans({
            name,amount,hours,session_id:session._id,
            time_from:session.time_from,
            time_to:session.time_to,
            ground:acad._id,
            ground_name:acad.name,
        })
        await adt.save()
        logger.info(`New Ground Plan Created Successfully - ${name} added successfully`)

        return res.status(200).json({message:'Ground Plan Created Successfully'});
    } catch (err){
        logger.error(`AddGroundPlan Error : ${err}`);
        return res.status(500).json({message:'SERVER ERROR'})
    }
}

const ViewGroundPlan = async (req, res) => {
    try{
        logger.info('View All Ground Plans Request Received');
        const result = await validateManagerRequest(req, res);
        if (result.error) {
            return res.status(result.status).json({ message: result.message });
        }
        const dt = await GroundPlans.find({active:true,delete:false}).populate('session_id academy sports');
        logger.info("Ground Plans Fetched and Sent Successfully")
        return res.status(200).json({message:'Ground Plans Fetched Successfully',data:encryptData(dt)});
    } catch (err){
        logger.error(`ViewGroundPlan Error : ${err}`);
        return res.status(500).json({message:'SERVER ERROR'})
    }
}

const ViewAllGroundPlan = async (req, res) => {
    try{
        logger.info('View All Ground Plans Request Received');
        const result = await validateManagerRequest(req, res);
        if (result.error) {
            return res.status(result.status).json({ message: result.message });
        }
        const dt = await GroundPlans.find({delete:false}).populate('session_id academy sports');
        logger.info("Ground Plans Fetched and Sent Successfully")
        return res.status(200).json({message:'Ground Plans Fetched Successfully',data:encryptData(dt)});
    } catch (err){
        logger.error(`ViewAllGroundPlan Error : ${err}`);
        return res.status(500).json({message:'SERVER ERROR'})
    }
}

const EditGroundPlan = async (req, res) => {
    try {
        logger.info('Edit Ground Sports Request Received');

        // Step 1: Validate Admin
        const result = await validateManagerRequest(req, res);
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
            ground_id,
            session_id,
            amount,
            hours
        } = decryptedData;

        // Step 3: Fetch existing plan
        const existingPlan = await GroundPlans.findById(id);
        if (!existingPlan) {
            logger.error('Ground Plans Not Found');
            return res.status(404).json({ message: "GroundPlans not found" });
        }

        let updatedFields = {};

        // Basic fields (only update if changed)
        if (name !== undefined && name !== existingPlan.name) updatedFields.name = name;
        if (amount !== undefined && amount !== existingPlan.amount) updatedFields.amount = amount;
        if (hours !== undefined && hours !== existingPlan.hours) updatedFields.hours = hours;
        if (active !== undefined && active !== existingPlan.active) updatedFields.active = active;

        // Step 4: Validate & update academy
        const academyObj = await Ground.findById(ground_id);
        if (!academyObj) {
            logger.error('Ground Not Found');
            return res.status(404).json({ message: "Ground not found" });
        }

        if (!academyObj._id.equals(existingPlan.academy)) {
            updatedFields.ground = academyObj._id;
            updatedFields.ground_name = academyObj.name;
        }

        // Step 5: Validate & update session
        const sessionObj = await GroundSessions.findById(session_id);
        if (!sessionObj || !sessionObj.ground.equals(academyObj._id)) {
            logger.error('Session Not Found');
            return res.status(404).json({ message: "Session not found" });
        }

        if (!sessionObj._id.equals(existingPlan.session_id)) {
            updatedFields.session_id = sessionObj._id;
            updatedFields.time_from = sessionObj.time_from;
            updatedFields.time_to = sessionObj.time_to;
        }

        // Step 6: Validate & update sport
        // Step 7: Update
        await GroundPlans.findByIdAndUpdate(id, updatedFields, { new: true });

        logger.info("GroundPlans updated successfully");
        return res.status(200).json({ message: "Ground Plan updated successfully" });

    } catch (err) {
        logger.error(`EditGroundPlans Error : ${err}`);
        return res.status(500).json({ message: 'SERVER ERROR' });
    }
};


const DeleteGroundPlan = async (req, res) => {
    try{
        logger.info('Delete Ground Plans Request Received');
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
        const adt = await GroundPlans.findById(id);
        if(!adt){
            logger.info('GroundPlans Not Found')
            return res.status(401).json({message:'Not Found'});
        }
        adt.delete = true;
        await adt.save();
        logger.info(`Ground Plan Successfully Deleted ${adt.name}`)
        return res.status(200).json({message:`Ground Plan Deleted Successfully : ${adt.name}`})
    } catch (err){
        logger.error(`DeleteGroundPlan Error : ${err}`);
        return res.status(500).json({message:'SERVER ERROR'})
    }
}

module.exports = {AddGroundPlan,EditGroundPlan,ViewAllGroundPlan,ViewGroundPlan,DeleteGroundPlan}
