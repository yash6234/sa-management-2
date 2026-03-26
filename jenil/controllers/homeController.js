const Home = require('../models/Home');
const { saveBase64Image } = require('../utils/fileUtils');

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

const processImageFields = (data) => {
    const imageFields = ['image', 'backgroundImage', 'mainImage', 'thumbnail', 'logo'];
    for (const field of imageFields) {
        if (data[field] && typeof data[field] === 'string' && data[field].startsWith('data:image')) {
            const savedPath = saveBase64Image(data[field]);
            if (savedPath) data[field] = savedPath;
        }
    }
    return data;
};

const getActiveHome = async () => {
    let home = await Home.findOne({ isActive: true });
    if (!home) home = await Home.create({ isActive: true });
    return home;
};

// 1. PUBLIC AGGREGATED ENDPOINT 
exports.getHomePageData = async (req, res) => {
    try {
        const homeData = await getActiveHome();
        res.status(200).json({ success: true, data: homeData });
    } catch (err) {
        console.error("Error fetching homepage data:", err);
        res.status(500).json({ success: false, error: 'Failed to fetch homepage data' });
    }
};

const Footer = require('../models/Footer');

// 1b. FOOTER ENDPOINT (shared across all pages)
exports.getFooterData = async (req, res) => {
    try {
        let footer = await Footer.findOne({ isActive: true });
        if (!footer) footer = await Footer.create({});
        res.status(200).json({ success: true, data: footer });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch footer data' });
    }
};

exports.updateFooter = async (req, res) => {
    try {
        let footer = await Footer.findOne({ isActive: true });
        if (!footer) footer = await Footer.create({});
        
        let updateData = { ...req.body };
        Object.assign(footer, updateData);
        await footer.save();
        res.status(200).json({ success: true, data: footer });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to update footer' });
    }
};

// 2. OBJECT SECTIONS (About, Footer, ProgramsAndFacilities, TournamentsSection, SocialSection) 
exports.getSection = (sectionName) => async (req, res) => {
    try {
        const home = await getActiveHome();
        if (home[sectionName] === undefined) {
             return res.status(404).json({ success: false, message: 'Section not found' });
        }
        res.status(200).json({ success: true, data: home[sectionName] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.updateSection = (sectionName) => async (req, res) => {
    try {
        const home = await getActiveHome();
        let updateData = { ...req.body };
        
        // Handle file uploads (both single and multiple)
        if (req.file) {
            setNested(updateData, req.file.fieldname, req.file.filename);
        }
        if (req.files) {
            const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
            files.forEach(file => {
                setNested(updateData, file.fieldname, file.filename);
            });
        }

        // Process any base64 images that might still be in the body
        updateData = processImageFields(updateData);

        // Merge updates
        const section = home[sectionName].toObject ? home[sectionName].toObject() : home[sectionName];
        home[sectionName] = { ...section, ...updateData };
        
        await home.save();
        res.status(200).json({ success: true, data: home[sectionName] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.deleteSection = (sectionName) => async (req, res) => {
    try {
        const home = await getActiveHome();
        home[sectionName] = undefined; 
        await home.save();
        res.status(200).json({ success: true, message: `Section ${sectionName} has been cleared/reset` });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// 3. ARRAY SECTIONS
exports.addArrayItem = (arrayPath) => async (req, res) => {
    try {
        const home = await getActiveHome();
        const parts = arrayPath.split('.');
        let targetArray = home;
        for (const part of parts) {
            targetArray = targetArray[part];
        }
        
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
        newItem = processImageFields(newItem);
        
        targetArray.push(newItem);
        await home.save();
        res.status(201).json({ success: true, data: targetArray });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.updateArrayItem = (arrayPath) => async (req, res) => {
    try {
        const home = await getActiveHome();
        const parts = arrayPath.split('.');
        let targetArray = home;
        for (const part of parts) {
            targetArray = targetArray[part];
        }
        
        let item;
        if (req.params.itemId) {
            item = targetArray.id(req.params.itemId);
        } else if (targetArray.length > 0) {
            item = targetArray[0];
        }

        if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
        
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
        updateData = processImageFields(updateData);
        
        Object.assign(item, updateData);
        await home.save();
        res.status(200).json({ success: true, data: targetArray });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.deleteArrayItem = (arrayPath) => async (req, res) => {
    try {
        const home = await getActiveHome();
        const parts = arrayPath.split('.');
        let targetArray = home;
        for (const part of parts) {
            targetArray = targetArray[part];
        }
        
        let item;
        if (req.params.itemId) {
            item = targetArray.id(req.params.itemId);
        } else if (targetArray.length > 0) {
            item = targetArray[0];
        }

        if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
        
        if (req.params.itemId) {
            targetArray.pull(req.params.itemId);
        } else {
            targetArray.shift();
        }

        await home.save();
        res.status(200).json({ success: true, message: 'Item deleted safely', data: targetArray });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
