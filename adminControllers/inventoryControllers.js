const {logger,encryptData, decryptData} = require("../utils/enc_dec_admin");
const {validateAdminRequest} = require("../middlewares/adminValidation");
const Academy = require("../models/Academy");
const AcademyInventory = require("../models/AcademyInventory");
const InventoryAllotment = require("../models/InventoryAllotment");
const mongoose = require("mongoose");
const {AddTransactionAdmin} = require("../utils/Trans_Fn");
const {generateDynamicReceipt} = require("../middlewares/receiptGenerator");

const AddInventory = async (req, res) => {
    try{
        logger.info('Adding New Inventory Request Received');
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
    const session = await mongoose.startSession();
    try{
        logger.info('Allot Inventory Request Received');
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
        
        const { roll_no,name,inventory_id,inv_trans,qty,amount,description,academy_id, } = result.data
        
        const acad = await Academy.findById(academy_id);
        if(!acad){
            logger.error(`Academy Not Found With this ID : ${academy_id}`)
            return res.status(404).json({message:"Academy not found"})
        }

        await session.withTransaction(async () => {

        const inv= await AcademyInventory.findById(inventory_id);
        if(!inv || inv.delete==true||inv.qty<Number(qty)){
            logger.error("Inventory Not Found or Insufficient Qty")
            return res.status(404).json({message:"Inventory Not Found or Insufficient Qty"})
        }
        const totalAmountInv = inv_trans.reduce(
      (sum, tx) => sum + Number(tx.amount || 0),
      0
    );

        inv.qty-=Number(qty);
        await inv.save();
        const tid = [];
        for (const tr of inv_trans) {
        const txDate = tr.date ? new Date(tr.date) : new Date();
        const tidr = await AddTransactionAdmin(
          txDate,
          Number(tr.amount) || 0,
          "IN",
          roll_no,
          roll_no,
          tr.method || "CASH",
          { session }
        );
        tid.push({
          transaction_id: tidr._id,
          amount: Number(tr.amount),
          method: tr.method,
          date: txDate
        });
      }

        const adt = new InventoryAllotment({
            to:roll_no,inventory:inv._id,name:inv.name,amount:totalAmountInv,qty,
            description,academy_id:acad._id,transactions:tid,
        })
        await adt.save();

        let txt = `Item : ${inv.name}, Inventory Taken : ${qty}`;
        generateDynamicReceipt(acad._id,{roll_no,receivedFrom:name,amount:totalAmountInv,transactions:[...inv_trans],remarks:`Inventory Allotment Receipt - ${txt}`})


        });

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