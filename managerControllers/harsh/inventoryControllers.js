const { encryptData, decryptData ,logger} = require("../../utils/enc_dec_m");
const {validateManagerRequest} = require("../../middlewares/managerValidation");
const User = require("../../models/Manager");
const Academy = require("../../models/Academy");
const AcademyInventory = require("../../models/AcademyInventory");
const InventoryAllotment = require("../../models/InventoryAllotment");
const mongoose = require("mongoose");

const AddInventory = async (req, res) => {
    try{
        logger.info('Adding New Inventory Request Received');
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
        logger.info("Manager Verified Successfully");
        const {name,amount,description,qty,academy_id}=decryptedData;

        const acad = await Academy.findById(academy_id);
        if(!acad){
            logger.error(`Academy Not Found With this ID : ${academy_id}`)
            return res.status(404).json({message:"Academy not found"})
        }

        const adt = new AcademyInventory({
            name,
            amount,description,qty,academy_id:acad._id
        })
        await adt.save()
        logger.info(`New Inventory Created Successfully - ${name} added successfully`)

        return res.status(200).json({message:'Inventory Created Successfully'});
    } catch (err){
        logger.error(`AddInventory Error : ${err}`);
        return res.status(500).json({message:'SERVER ERROR'})
    }
}

const RemoveInventory = async (req, res) => {
    try{
        logger.info('Remove Inventory Request Received');
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
        logger.info("Manager Verified Successfully");
        const {inv_id}=decryptedData;

        const adt = await AcademyInventory.findById(inv_id)
        if(!adt || adt.delete==true){
            logger.error("Inventory Not Found")
            return res.status(404).json({message:"Inventory Not Found"})
        }
        adt.active=false;
        adt.delete=true;
        await adt.save();
        return res.status(200).json({message:'Inventory Removed Successfully'});
    } catch (err){
        logger.error(`RemoveInventory Error : ${err}`);
        return res.status(500).json({message:'SERVER ERROR'})
    }
}

const EditInventory = async (req, res) => {
    try{
        logger.info('Edit Inventory Request Received');
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
        logger.info("Manager Verified Successfully");
        const {inv_id,name,amount,description,qty,academy_id,active}=decryptedData;

        const acad = await Academy.findById(academy_id);
        if(!acad){
            logger.error(`Academy Not Found With this ID : ${academy_id}`)
            return res.status(404).json({message:"Academy not found"})
        }

        const adt = await AcademyInventory.findById(inv_id)
        if(!adt || adt.delete==true){
            logger.error("Inventory Not Found")
            return res.status(404).json({message:"Inventory Not Found"})
        }

        const list= {name:adt.name,amount:adt.amount,qty:adt.qty,academy_id:adt.academy_id,
            log:"List Edited Successfully",
        active:adt.active,description:adt.description,createdAt:adt.createdAt,updatedAt:adt.updatedAt}

        adt.name=name||adt.name;
        adt.amount=amount||adt.amount;
        adt.qty=qty||adt.qty;
        adt.description=description||adt.description;
        adt.academy_id=acad._id||adt.academy_id;
        adt.active=active||adt.active;
        adt.past_logs.push(list);
        await adt.save()
        logger.info(`Inventory Edit Successful`)

        return res.status(200).json({message:'Inventory Edited Successfully'});
    } catch (err){
        logger.error(`EditInventory Error : ${err}`);
        return res.status(500).json({message:'SERVER ERROR'})
    }
}

const AllotInventory = async (req, res) => {
    try{
        logger.info('Allot Inventory Request Received');
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
        logger.info("Manager Verified Successfully");
        const {inv_id}=decryptedData;

        const acad = await Academy.findById(academy_id);
        if(!acad){
            logger.error(`Academy Not Found With this ID : ${academy_id}`)
            return res.status(404).json({message:"Academy not found"})
        }

        const adt = new AcademyInventory({
            name,
            amount,description,qty
        })
        await adt.save()
        logger.info(`New Inventory Created Successfully - ${name} added successfully`)

        return res.status(200).json({message:'Inventory Created Successfully'});
    } catch (err){
        logger.error(`AddInventory Error : ${err}`);
        return res.status(500).json({message:'SERVER ERROR'})
    }
}

const AddQtyToInventory = async (req, res) => {
    try{
        logger.info('Adding New Qty to Inventory Request Received');
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
        logger.info("Manager Verified Successfully");
        const {inv_id,qty}=decryptedData;

        const adt = await AcademyInventory.findById(inv_id)
        if(!adt || adt.delete==true){
            logger.error("Inventory Not Found")
            return res.status(404).json({message:"Inventory Not Found"})
        }

        if(Number(qty)>0){
            const list= {name:adt.name,amount:adt.amount,qty:adt.qty,academy_id:adt.academy_id,
                log:`Qty ${qty} added to Inventory Successfully`,
            active:adt.active,description:adt.description,createdAt:adt.createdAt,updatedAt:adt.updatedAt}
            adt.qty+=Number(qty);
            adt.past_logs.push(list);
            await adt.save()
        }

        return res.status(200).json({message:'Inventory Qty Updated Successfully'});
    } catch (err){
        logger.error(`AddQtyToInventory Error : ${err}`);
        return res.status(500).json({message:'SERVER ERROR'})
    }
}

const FetchAllInventory = async (req, res) => {
    try{
        logger.info('Fetch All Inventory Request Received');
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
        logger.info("Manager Verified Successfully");
        const {academy_id}=decryptedData;

        const acad = await Academy.findById(academy_id);
        if(!acad){
            logger.error(`Academy Not Found With this ID : ${academy_id}`)
            return res.status(404).json({message:"Academy not found"})
        }

        const dt = await AcademyInventory.find({academy_id:acad._id,delete:false})
        return res.status(200).json({message:'Inventory Fetched Successfully',data:encryptData(dt)});
    } catch (err){
        logger.error(`FetchAllInventory Error : ${err}`);
        return res.status(500).json({message:'SERVER ERROR'})
    }
}

const FetchInventory = async (req, res) => {
    try{
        logger.info('Fetch Inventory Request Received');
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
        logger.info("Manager Verified Successfully");
        const {academy_id}=decryptedData;

        const acad = await Academy.findById(academy_id);
        if(!acad){
            logger.error(`Academy Not Found With this ID : ${academy_id}`)
            return res.status(404).json({message:"Academy not found"})
        }
        logger.info("Inventory Fetched Successfully");
        const dt = await AcademyInventory.find({academy_id:acad._id,active:true,delete:false})
        return res.status(200).json({message:'Inventory Fetched Successfully',data:encryptData(dt)});
    } catch (err){
        logger.error(`FetchInventory Error : ${err}`);
        return res.status(500).json({message:'SERVER ERROR'})
    }
}

const GetInventory = async (req, res) => {
    try{
        logger.info('Get Inventory Request Received');
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
        logger.info("Manager Verified Successfully");
        const {inv_id}=decryptedData;

        const dt = await AcademyInventory.findOne({_id:new mongoose.Types.ObjectId(inv_id),delete:false})
        if(!dt){
            logger.error("Inventory Not Found")
            return res.status(404).json({message:"Inventory not found"})
        }

        const allot_dt = await InventoryAllotment.find({inventory:dt._id}).populate('academy_id').populate('inventory')
        return res.status(200).json({message:'Inventory Fetched Successfully'
            ,data:encryptData(dt),data1:encryptData(allot_dt)});
    } catch (err){
        logger.error(`GetInventory Error : ${err}`);
        return res.status(500).json({message:'SERVER ERROR'})
    }
}

module.exports={
    AddInventory,
    RemoveInventory,
    GetInventory,
    EditInventory,
    AllotInventory,
    AddQtyToInventory,
    FetchAllInventory,
    FetchInventory,
}
