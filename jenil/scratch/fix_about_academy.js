const fs = require('fs');
const path = require('path');

const filePath = 'e:\\sa-management-2\\jenil\\controllers\\Admin Controllers\\aboutAcademyControllerA.js';
let content = fs.readFileSync(filePath, 'utf8');

const target = `    try {
        try {
            const encryptedData = req.params.data || req.body.data || req.query.data;
            if (encryptedData) {
                const decodedData = decodeURIComponent(encryptedData);
                const decryptedData = decryptData(decodedData);
            }
        } catch (e) { }
        const about = await getActiveAbout();`;

const replacement = `    try {
        let decryptedData;
        try {
            if (req.adminData && isPlainObject(req.adminData)) {
                decryptedData = req.adminData;
            } else if (req.decryptedBody && isPlainObject(req.decryptedBody)) {
                decryptedData = req.decryptedBody;
            }

            if (!decryptedData || Object.keys(decryptedData).length === 0 || (decryptedData.data && typeof decryptedData.data === 'string')) {
                const encryptedData = req.params.data || req.body.data || req.query.data;
                if (encryptedData) {
                    const decodedData = decodeURIComponent(encryptedData);
                    let firstLevel = decryptData(decodedData);

                    if (firstLevel && firstLevel.data && typeof firstLevel.data === 'string') {
                        try {
                            decryptedData = decryptData(firstLevel.data);
                        } catch (e) {
                            decryptedData = firstLevel;
                        }
                    } else {
                        decryptedData = firstLevel;
                    }
                }
            }

            if (decryptedData && typeof decryptedData === 'string') {
                try { decryptedData = JSON.parse(decryptedData); } catch (e) { }
            }
        } catch (error) {
            console.error(\`[AboutController] Decryption failed in updateSection:\`, error);
        }
        const about = await getActiveAbout();`;

// Try exact match first
if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(filePath, content);
    console.log('Successfully updated aboutAcademyControllerA.js');
} else {
    // Try with normalized newlines
    const normalizedContent = content.replace(/\r\n/g, '\n');
    const normalizedTarget = target.replace(/\r\n/g, '\n');
    if (normalizedContent.includes(normalizedTarget)) {
        const result = normalizedContent.replace(normalizedTarget, replacement.replace(/\r\n/g, '\n'));
        fs.writeFileSync(filePath, result);
        console.log('Successfully updated aboutAcademyControllerA.js (normalized newlines)');
    } else {
        console.error('Target not found in aboutAcademyControllerA.js');
        // Log a small piece of content around where we expect it
        const index = content.indexOf('exports.updateSection');
        if (index !== -1) {
            console.log('Context around exports.updateSection:');
            console.log(content.substring(index, index + 300));
        }
    }
}
