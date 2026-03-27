const GalleryPage = require('../models/GalleryPage');

const toDotPath = (value) => {
    if (typeof value !== 'string') return '';
    return value.replace(/\[(\w+)\]/g, '.$1').replace(/^\./, '');
};

const toSectionRelativeFieldPath = (sectionName, fieldname) => {
    const sectionDot = toDotPath(sectionName);
    const fieldDot = toDotPath(fieldname);

    if (sectionDot && fieldDot.startsWith(sectionDot + '.')) {
        return fieldDot.slice(sectionDot.length + 1);
    }

    return fieldname;
};

// Helper to set nested property by string path (handles both dots and brackets)
const setNested = (obj, path, value) => {
    const parts = toDotPath(path).split('.').filter(Boolean);
    if (parts.length === 0) return;
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!current[part] || typeof current[part] !== 'object') current[part] = {};
        current = current[part];
    }
    current[parts[parts.length - 1]] = value;
};

const getUploadedFiles = (req) => {
    const files = [];
    if (req.file) files.push(req.file);
    if (req.files) {
        if (Array.isArray(req.files)) files.push(...req.files);
        else files.push(...Object.values(req.files).flat());
    }
    return files;
};

const getItemFieldname = (fieldname) => {
    const dot = toDotPath(fieldname);
    if (!dot) return fieldname;
    const parts = dot.split('.').filter(Boolean);
    return parts[parts.length - 1] || fieldname;
};

const getActiveGallery = async () => {
    let gallery = await GalleryPage.findOne({ isActive: true }).sort({ updatedAt: -1, createdAt: -1, _id: -1 });
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
        const updateData = {};

        for (const [key, value] of Object.entries(req.body || {})) {
            const relativePath = toSectionRelativeFieldPath(sectionName, key);
            setNested(updateData, relativePath, value);
        }

        // Handle file uploads
        for (const file of getUploadedFiles(req)) {
            const relativePath = toSectionRelativeFieldPath(sectionName, file.fieldname);
            setNested(updateData, relativePath, file.filename);
        }

        // Common alias support for hero background uploads (some clients send `background` or `image`)
        if (toDotPath(sectionName) === 'hero') {
            if (updateData.backgroundImage === undefined) {
                if (updateData.background !== undefined) updateData.backgroundImage = updateData.background;
                else if (updateData.bgImage !== undefined) updateData.backgroundImage = updateData.bgImage;
                else if (updateData.bg !== undefined) updateData.backgroundImage = updateData.bg;
                else if (updateData.image !== undefined) updateData.backgroundImage = updateData.image;
            }
            delete updateData.background;
            delete updateData.bgImage;
            delete updateData.bg;
            delete updateData.image;
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
            if (updateData.categories !== undefined) {
                if (typeof updateData.categories === 'string') {
                    gallery.categories = updateData.categories.split(',').map(c => c.trim()).filter(Boolean);
                } else if (Array.isArray(updateData.categories)) {
                    gallery.categories = updateData.categories;
                }
            }
        } else {
            const currentSection = gallery[sectionName];
            const currentObj = currentSection?.toObject ? currentSection.toObject() : (currentSection || {});
            gallery[sectionName] = { ...currentObj, ...updateData };
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
        for (const file of getUploadedFiles(req)) {
            setNested(newItem, getItemFieldname(file.fieldname), file.filename);
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
        for (const file of getUploadedFiles(req)) {
            setNested(updateData, getItemFieldname(file.fieldname), file.filename);
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
        for (const file of getUploadedFiles(req)) {
            setNested(newItem, getItemFieldname(file.fieldname), file.filename);
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
        for (const file of getUploadedFiles(req)) {
            setNested(updateData, getItemFieldname(file.fieldname), file.filename);
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
