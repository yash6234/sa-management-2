const fs = require('fs');
const path = require('path');
const adminControllersDir = 'e:/sa-management-2/jenil/controllers/Admin Controllers';

const files = fs.readdirSync(adminControllersDir);
files.forEach(file => {
    const filePath = path.join(adminControllersDir, file);
    if (fs.statSync(filePath).isFile() && file.endsWith('.js')) {
        let content = fs.readFileSync(filePath, 'utf8');
        // Specifically fix the enc_dec_admin path to be exactly ../../../utils/enc_dec_admin
        // Match any number of ../ and replace with exactly ../../../
        const newContent = content.replace(/(\.\.\/)+utils\/enc_dec_admin/g, '../../../utils/enc_dec_admin');
        if (content !== newContent) {
            fs.writeFileSync(filePath, newContent, 'utf8');
            console.log(`Normalized enc_dec path in: ${file}`);
        }
    }
});
