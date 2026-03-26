const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const saveBase64Image = (base64String, folderName = 'uploads') => {
    try {
        if (!base64String || !base64String.startsWith('data:image')) return null;

        // Extract mime type and base64 data
        const matches = base64String.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) return null;

        const extension = matches[1].split('/')[1] === 'jpeg' ? 'jpg' : matches[1].split('/')[1];
        const data = Buffer.from(matches[2], 'base64');

        const uniqueFileName = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${extension}`;
        const relativePath = path.join(folderName, uniqueFileName); // 'uploads/...'
        const absolutePath = path.join(__dirname, '..', 'public', relativePath);

        // Ensure directory exists
        const dir = path.dirname(absolutePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(absolutePath, data);

        // Standardize path for DB
        return 'public/' + relativePath.replace(/\\/g, '/'); // 'public/uploads/...'
    } catch (err) {
        console.error('Error saving base64 image:', err);
        return null;
    }
};

module.exports = { saveBase64Image };
