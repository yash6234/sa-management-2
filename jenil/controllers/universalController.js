const { logger, decryptData } = require("../../utils/enc_dec_admin");

const models = {
    Home: require('../models/Home'),
    AboutAcademy: require('../models/AboutAcademy'),
    AdmissionsPage: require('../models/AdmissionsPage'),
    GalleryPage: require('../models/GalleryPage'),
    PlaygroundPage: require('../models/PlaygroundPage'),
    ProgramsPage: require('../models/ProgramsPage')
};

const getModel = (modelName) => {
    const formattedName = modelName.charAt(0).toUpperCase() + modelName.slice(1).toLowerCase();
    return models[formattedName] || models[modelName];
};

exports.create = async (req, res) => {
    try {
        logger.info("User Login request received");
        const decryptedData = decryptData(req.params.data || req.body.data || req.query.data);
        logger.info(`Decrypted login data - ${decryptedData.email} - ${decryptedData.password}`);
        const Model = getModel(req.params.modelName);
        if (!Model) return res.status(404).json({ error: 'Model not found' });
        
        let newData = { ...req.body };
        if (req.file) newData.image = req.file.filename || req.file.path;
        
        const data = new Model(newData);
        await data.save();
        res.status(201).json({ success: true, data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getAll = async (req, res) => {
    try {
        logger.info("User Login request received");
        const decryptedData = decryptData(req.params.data || req.body.data || req.query.data);
        logger.info(`Decrypted login data - ${decryptedData.email} - ${decryptedData.password}`);
        const Model = getModel(req.params.modelName);
        if (!Model) return res.status(404).json({ error: 'Model not found' });
        
        const data = await Model.find();
        res.status(200).json({ success: true, data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getById = async (req, res) => {
    try {
        logger.info("User Login request received");
        const decryptedData = decryptData(req.params.data || req.body.data || req.query.data);
        logger.info(`Decrypted login data - ${decryptedData.email} - ${decryptedData.password}`);
        const Model = getModel(req.params.modelName);
        if (!Model) return res.status(404).json({ error: 'Model not found' });
        
        const data = await Model.findById(req.params.id);
        if (!data) return res.status(404).json({ error: 'Not found' });
        res.status(200).json({ success: true, data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.update = async (req, res) => {
    try {
        logger.info("User Login request received");
        const decryptedData = decryptData(req.params.data || req.body.data || req.query.data);
        logger.info(`Decrypted login data - ${decryptedData.email} - ${decryptedData.password}`);
        const Model = getModel(req.params.modelName);
        if (!Model) return res.status(404).json({ error: 'Model not found' });
        
        let updateData = { ...req.body };
        if (req.file) updateData.image = req.file.filename || req.file.path;
        
        const data = await Model.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!data) return res.status(404).json({ error: 'Not found' });
        res.status(200).json({ success: true, data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.delete = async (req, res) => {
    try {
        logger.info("User Login request received");
        const decryptedData = decryptData(req.params.data || req.body.data || req.query.data);
        logger.info(`Decrypted login data - ${decryptedData.email} - ${decryptedData.password}`);
        const Model = getModel(req.params.modelName);
        if (!Model) return res.status(404).json({ error: 'Model not found' });
        
        const data = await Model.findByIdAndDelete(req.params.id);
        if (!data) return res.status(404).json({ error: 'Not found' });
        res.status(200).json({ success: true, message: 'Deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
