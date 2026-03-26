const GalleryPage = require('../models/GalleryPage');

// Helper to set nested property by string path
const setNested = (obj, path, value) => {
    const parts = path.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) current[parts[i]] = {};
        current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
};

const getActiveGallery = async () => {
    let gallery = await GalleryPage.findOne({ isActive: true });
    if (!gallery) gallery = await GalleryPage.create({ isActive: true });
    return gallery;
};

const getGalleryGrid = (galleryDocOrObject) => ({
    categories: galleryDocOrObject.categories || [],
    images: galleryDocOrObject.images || []
});

// 1. PUBLIC AGGREGATED ENDPOINT 
exports.getGalleryData = async (req, res) => {
    try {
        const galleryData = await getActiveGallery();
        const data = galleryData.toObject();
        data.galleryGrid = getGalleryGrid(data);
        // Keep categories + images as a single section in the public payload
        delete data.categories;
        delete data.images;
        res.status(200).json({ success: true, data });
    } catch (err) {
        console.error("Error fetching gallery page data:", err);
        res.status(500).json({ success: false, error: 'Failed to fetch gallery data' });
    }
};

// 2. CONFIG SECTIONS (Hero, Categories, GalleryGrid)
exports.getSection = (sectionName) => async (req, res) => {
    try {
        const gallery = await getActiveGallery();
        if (sectionName === 'galleryGrid') {
            return res.status(200).json({ success: true, data: getGalleryGrid(gallery) });
        }
        if (gallery[sectionName] === undefined) {
             return res.status(404).json({ success: false, message: 'Section not found' });
        }
        res.status(200).json({ success: true, data: gallery[sectionName] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.updateSection = (sectionName) => async (req, res) => {
    try {
        const gallery = await getActiveGallery();
        let updateData = { ...req.body };

        // Handle file uploads
        if (req.file) {
            setNested(updateData, req.file.fieldname, req.file.filename);
        }
        if (req.files) {
            const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
            files.forEach(file => {
                setNested(updateData, file.fieldname, file.filename);
            });
        }

        if (sectionName === 'galleryGrid') {
            if (updateData.categories !== undefined) {
                if (typeof updateData.categories === 'string') {
                    gallery.categories = updateData.categories.split(',').map(c => c.trim()).filter(Boolean);
                } else if (Array.isArray(updateData.categories)) {
                    gallery.categories = updateData.categories;
                }
            }

            if (Array.isArray(updateData.images)) {
                gallery.images = updateData.images;
            }

            await gallery.save();
            return res.status(200).json({ success: true, data: getGalleryGrid(gallery) });
        }

        if (sectionName === 'categories') {
            if (req.body.categories) {
                if (typeof req.body.categories === 'string') {
                    gallery.categories = req.body.categories.split(',').map(c => c.trim());
                } else if (Array.isArray(req.body.categories)) {
                    gallery.categories = req.body.categories;
                }
            }
        } else {
            gallery[sectionName] = { ...gallery[sectionName].toObject(), ...updateData };
        }
        
        await gallery.save();
        res.status(200).json({ success: true, data: gallery[sectionName] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.deleteSection = (sectionName) => async (req, res) => {
    try {
        const gallery = await getActiveGallery();
        if (sectionName === 'galleryGrid') {
            gallery.categories = [];
            gallery.images = [];
            await gallery.save();
            return res.status(200).json({ success: true, message: 'Section galleryGrid has been cleared/reset' });
        }
        if (sectionName === 'categories') {
            gallery.categories = [];
        } else {
            gallery[sectionName] = undefined;
        }
        await gallery.save();
        res.status(200).json({ success: true, message: `Section ${sectionName} has been cleared/reset` });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// 3. IMAGE LIST MANAGEMENT
exports.addImage = async (req, res) => {
    try {
        const gallery = await getActiveGallery();
        let newItem = { ...req.body };
        if (req.file) {
            setNested(newItem, req.file.fieldname, req.file.filename);
        }
        if (req.files) {
            const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
            files.forEach(file => {
                setNested(newItem, file.fieldname, file.filename);
            });
        }
        
        if (!newItem.image) return res.status(400).json({ success: false, message: 'Image is required' });

        gallery.images.push(newItem);
        await gallery.save();
        res.status(201).json({ success: true, data: gallery.images });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.updateImage = async (req, res) => {
    try {
        const gallery = await getActiveGallery();
        const item = gallery.images.id(req.params.itemId);
        if (!item) return res.status(404).json({ success: false, message: 'Image not found' });
        
        let updateData = { ...req.body };
        if (req.file) {
            setNested(updateData, req.file.fieldname, req.file.filename);
        }
        if (req.files) {
            const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
            files.forEach(file => {
                setNested(updateData, file.fieldname, file.filename);
            });
        }
        
        Object.assign(item, updateData);
        await gallery.save();
        res.status(200).json({ success: true, data: gallery.images });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.deleteImage = async (req, res) => {
    try {
        const gallery = await getActiveGallery();
        const item = gallery.images.id(req.params.itemId);
        if (!item) return res.status(404).json({ success: false, message: 'Image not found' });
        
        gallery.images.pull(req.params.itemId);
        await gallery.save();
        res.status(200).json({ success: true, message: 'Image deleted from gallery', data: gallery.images });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// 4. TRAINING MOMENTS LIST MANAGEMENT
exports.addTrainingMomentImage = async (req, res) => {
    try {
        const gallery = await getActiveGallery();
        let newItem = { ...req.body };
        if (req.file) {
            setNested(newItem, req.file.fieldname, req.file.filename);
        }
        if (req.files) {
            const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
            files.forEach(file => {
                setNested(newItem, file.fieldname, file.filename);
            });
        }
        
        if (!newItem.image) return res.status(400).json({ success: false, message: 'Image is required' });

        gallery.trainingMoments.list.push(newItem);
        await gallery.save();
        res.status(201).json({ success: true, data: gallery.trainingMoments.list });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.updateTrainingMomentImage = async (req, res) => {
    try {
        const gallery = await getActiveGallery();
        const item = gallery.trainingMoments.list.id(req.params.itemId);
        if (!item) return res.status(404).json({ success: false, message: 'Image not found' });
        
        let updateData = { ...req.body };
        if (req.file) {
            setNested(updateData, req.file.fieldname, req.file.filename);
        }
        if (req.files) {
            const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
            files.forEach(file => {
                setNested(updateData, file.fieldname, file.filename);
            });
        }
        
        Object.assign(item, updateData);
        await gallery.save();
        res.status(200).json({ success: true, data: gallery.trainingMoments.list });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.deleteTrainingMomentImage = async (req, res) => {
    try {
        const gallery = await getActiveGallery();
        const item = gallery.trainingMoments.list.id(req.params.itemId);
        if (!item) return res.status(404).json({ success: false, message: 'Image not found' });
        
        gallery.trainingMoments.list.pull(req.params.itemId);
        await gallery.save();
        res.status(200).json({ success: true, message: 'Image deleted from training moments', data: gallery.trainingMoments.list });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
