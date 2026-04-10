const fs = require('fs');
const path = require('path');

const filePath = 'e:\\sa-management-2\\jenil\\controllers\\Admin Controllers\\galleryPageControllerA.js';
let content = fs.readFileSync(filePath, 'utf8');

const targetAdd = `    try {
        try {
            const encryptedData = req.params.data || req.body.data || req.query.data;
            if (encryptedData) {
                const decodedData = decodeURIComponent(encryptedData);
                const decryptedData = decryptData(decodedData);
            }
        } catch (e) { }`;

const replacementAdd = `    try {
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
            console.error(\`[GalleryController] Decryption failed in addArrayItem for \${arrayPath}:\`, error);
        }
`;

const targetUpdate = `    try {
        try {
            const encryptedData = req.params.data || req.body.data || req.query.data;
            if (encryptedData) {
                const decodedData = decodeURIComponent(encryptedData);
                const decryptedData = decryptData(decodedData);
            }
        } catch (e) { }`;

const replacementUpdate = `    try {
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
            console.error(\`[GalleryController] Decryption failed in updateArrayItem for \${arrayPath}:\`, error);
        }
`;

// Helper for replacement
function replaceAll(text, target, replacement) {
    let newText = text;
    let index = newText.indexOf(target);
    while (index !== -1) {
        newText = newText.substring(0, index) + replacement + newText.substring(index + target.length);
        index = newText.indexOf(target, index + replacement.length);
    }
    return newText;
}

// Normalized replacement
let newContent = content.replace(/\r\n/g, '\n');
const normalizedTargetAdd = targetAdd.replace(/\r\n/g, '\n');
const normalizedTargetUpdate = targetUpdate.replace(/\r\n/g, '\n');

if (newContent.includes(normalizedTargetAdd)) {
    newContent = replaceAll(newContent, normalizedTargetAdd, replacementAdd.replace(/\r\n/g, '\n'));
    // usage fix in Gallery updateArrayItem
    const usageTarget = `let updateData = normalizePaths(req.body);`;
    const usageReplacement = `let updateData = (decryptedData && Object.keys(decryptedData).length > 0) ? normalizePaths(decryptedData) : normalizePaths(req.body);`;
    newContent = newContent.replace(usageTarget, usageReplacement);

    fs.writeFileSync(filePath, newContent);
    console.log('Successfully updated galleryPageControllerA.js');
} else {
    console.error('Target not found in galleryPageControllerA.js');
}
