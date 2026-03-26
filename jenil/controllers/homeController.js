const Home = require('../models/Home');

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
        if (req.file) {
            // Specifically handling image/backgroundImage for specific sections
            if (sectionName === 'about') updateData.image = req.file.filename;
            if (sectionName === 'hero') updateData.backgroundImage = req.file.filename;
        }

        home[sectionName] = { ...home[sectionName].toObject(), ...updateData };
        await home.save();
        res.status(200).json({ success: true, data: home[sectionName] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.deleteSection = (sectionName) => async (req, res) => {
    try {
        const home = await getActiveHome();
        // Since it's a fixed schema object, deletion means "clearing" or "resetting"
        home[sectionName] = undefined; // Mark for re-initialization from defaults in next save
        await home.save();
        res.status(200).json({ success: true, message: `Section ${sectionName} has been cleared/reset` });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// 3. ARRAY SECTIONS (Hero, Gallery, SocialPosts)
exports.addArrayItem = (arrayPath) => async (req, res) => {
    try {
        const home = await getActiveHome();
        // Resolve nested paths like 'socialSection.posts'
        const parts = arrayPath.split('.');
        let targetArray = home;
        for (const part of parts) {
            targetArray = targetArray[part];
        }
        let newItem = { ...req.body };
        if (req.file) {
            if (arrayPath === 'hero') {
                newItem.backgroundImage = req.file.filename;
            } else {
                newItem.image = req.file.filename;
            }
        }
        
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
        
        const item = targetArray.id(req.params.itemId);
        if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
        
        let updateData = { ...req.body };
        if (req.file) {
            if (arrayPath === 'hero') {
                updateData.backgroundImage = req.file.filename;
            } else {
                updateData.image = req.file.filename;
            }
        }
        
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
        
        const item = targetArray.id(req.params.itemId);
        if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
        
        targetArray.pull(req.params.itemId);
        await home.save();
        res.status(200).json({ success: true, message: 'Item deleted safely', data: targetArray });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
