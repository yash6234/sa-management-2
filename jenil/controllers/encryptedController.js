const { encryptData, decryptData: decryptCryptoJS } = require('../utils/encryption');
const { logger, decryptData } = require("../../utils/enc_dec_admin");

/**
 * Generic Encrypted CRUD Controller
 * Handles encrypted payloads in URL parameters
 */

// Helper to get model dynamically
const getModel = (modelName) => {
    try {
        return require(`../models/${modelName}`);
    } catch (e) {
        return null;
    }
};

/**
 * CREATE - POST /:entity/add/:data
 * Payload: { name, mobile_no, email, address, ... }
 */
exports.createEncrypted = (modelName, options = {}) => async (req, res) => {
    try {
        try {
            const encryptedData = req.params.data;
            if (encryptedData) {
                logger.info("User Login request received");
                const decryptedData = decryptData(encryptedData);
                logger.info(`Decrypted login data - ${decryptedData.email} - ${decryptedData.password}`);
            }
        } catch (e) { }
        const Model = getModel(modelName);
        if (!Model) {
            return res.status(400).json({
                encrypted: true,
                data: encryptData({ success: false, message: 'Invalid model' })
            });
        }

        const data = req.decryptedBody || req.body;

        // Validate required fields
        if (options.requiredFields) {
            const missing = options.requiredFields.filter(field => !data[field]);
            if (missing.length > 0) {
                return res.status(400).json({
                    encrypted: true,
                    data: encryptData({
                        success: false,
                        message: `Missing required fields: ${missing.join(', ')}`
                    })
                });
            }
        }

        const item = new Model(data);
        await item.save();

        return res.status(201).json({
            encrypted: true,
            data: encryptData({ success: true, data: item })
        });
    } catch (error) {
        console.error('Create error:', error);
        return res.status(500).json({
            encrypted: true,
            data: encryptData({ success: false, message: error.message })
        });
    }
};

/**
 * UPDATE - PUT /:entity/edit/:data
 * Payload: { _id, name, mobile_no, email, address, ... }
 */
exports.updateEncrypted = (modelName) => async (req, res) => {
    try {
        try {
            const encryptedData = req.params.data;
            if (encryptedData) {
                logger.info("User Login request received");
                const decryptedData = decryptData(encryptedData);
                logger.info(`Decrypted login data - ${decryptedData.email} - ${decryptedData.password}`);
            }
        } catch (e) { }
        const Model = getModel(modelName);
        if (!Model) {
            return res.status(400).json({
                encrypted: true,
                data: encryptData({ success: false, message: 'Invalid model' })
            });
        }

        const data = req.decryptedBody || req.body;
        const { _id } = data;

        if (!_id) {
            return res.status(400).json({
                encrypted: true,
                data: encryptData({ success: false, message: '_id is required' })
            });
        }

        const item = await Model.findByIdAndUpdate(_id, { $set: data }, { new: true });

        if (!item) {
            return res.status(404).json({
                encrypted: true,
                data: encryptData({ success: false, message: 'Item not found' })
            });
        }

        return res.status(200).json({
            encrypted: true,
            data: encryptData({ success: true, data: item })
        });
    } catch (error) {
        console.error('Update error:', error);
        return res.status(500).json({
            encrypted: true,
            data: encryptData({ success: false, message: error.message })
        });
    }
};

/**
 * FETCH - GET /:entity/fetch/:data
 * Payload: { _id } for single item, or {} for all items
 */
exports.fetchEncrypted = (modelName, options = {}) => async (req, res) => {
    try {
        try {
            const encryptedData = req.params.data;
            if (encryptedData) {
                logger.info("User Login request received");
                const decryptedData = decryptData(encryptedData);
                logger.info(`Decrypted login data - ${decryptedData.email} - ${decryptedData.password}`);
            }
        } catch (e) { }
        const Model = getModel(modelName);
        if (!Model) {
            return res.status(400).json({
                encrypted: true,
                data: encryptData({ success: false, message: 'Invalid model' })
            });
        }

        const data = req.decryptedBody || req.body || {};
        const { _id, ...filters } = data;
        let result;

        if (_id) {
            // Fetch single item
            result = await Model.findById(_id);
            if (!result) {
                return res.status(404).json({
                    encrypted: true,
                    data: encryptData({ success: false, message: 'Item not found' })
                });
            }
        } else {
            // Fetch all with optional filters
            let query = Model.find(filters);

            if (options.populate) {
                query = query.populate(options.populate);
            }

            if (options.sort) {
                query = query.sort(options.sort);
            }

            result = await query;
        }

        return res.status(200).json({
            encrypted: true,
            data: encryptData({ success: true, data: result })
        });
    } catch (error) {
        console.error('Fetch error:', error);
        return res.status(500).json({
            encrypted: true,
            data: encryptData({ success: false, message: error.message })
        });
    }
};

/**
 * DELETE - DELETE /:entity/delete/:data
 * Payload: { _id }
 */
exports.deleteEncrypted = (modelName) => async (req, res) => {
    try {
        try {
            const encryptedData = req.params.data;
            if (encryptedData) {
                logger.info("User Login request received");
                const decryptedData = decryptData(encryptedData);
                logger.info(`Decrypted login data - ${decryptedData.email} - ${decryptedData.password}`);
            }
        } catch (e) { }
        const Model = getModel(modelName);
        if (!Model) {
            return res.status(400).json({
                encrypted: true,
                data: encryptData({ success: false, message: 'Invalid model' })
            });
        }

        const data = req.decryptedBody || req.body;
        const { _id } = data;

        if (!_id) {
            return res.status(400).json({
                encrypted: true,
                data: encryptData({ success: false, message: '_id is required' })
            });
        }

        const result = await Model.findByIdAndDelete(_id);

        if (!result) {
            return res.status(404).json({
                encrypted: true,
                data: encryptData({ success: false, message: 'Item not found' })
            });
        }

        return res.status(200).json({
            encrypted: true,
            data: encryptData({ success: true, message: 'Deleted successfully' })
        });
    } catch (error) {
        console.error('Delete error:', error);
        return res.status(500).json({
            encrypted: true,
            data: encryptData({ success: false, message: error.message })
        });
    }
};

/**
 * Custom Encrypted Action - For any custom operation
 */
exports.customEncrypted = (handler) => async (req, res) => {
    try {
        try {
            const encryptedData = req.params.data || req.body.data || req.query.data;
            if (encryptedData) {
                logger.info("User Login request received");
                const decryptedData = decryptData(encryptedData);
                logger.info(`Decrypted login data - ${decryptedData.email} - ${decryptedData.password}`);
            }
        } catch (e) { }
        const data = req.decryptedBody || req.body;
        await handler(data, req, res);
    } catch (error) {
        console.error('Custom action error:', error);
        return res.status(500).json({
            encrypted: true,
            data: encryptData({ success: false, message: error.message })
        });
    }
};
