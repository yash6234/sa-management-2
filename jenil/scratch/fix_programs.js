const fs = require('fs');
const path = require('path');

const filePath = 'e:\\sa-management-2\\jenil\\controllers\\Admin Controllers\\programsPageControllerA.js';
let content = fs.readFileSync(filePath, 'utf8');

const targetStr = `        try {
            const encryptedData = req.params.data || req.body.data || req.query.data;
            if (encryptedData) {
                const decodedData = decodeURIComponent(encryptedData);
                const decryptedData = decryptData(decodedData);
            }
        } catch (e) { }`;

const replacementStr = `        let decryptedData;
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
            console.error(\`[ProgramsController] Decryption failed:\`, error);
        }
`;

// Normalized replacement
let newContent = content.replace(/\r\n/g, '\n');
const normalizedTarget = targetStr.replace(/\r\n/g, '\n');
const normalizedReplacement = replacementStr.replace(/\r\n/g, '\n');

if (newContent.includes(normalizedTarget)) {
    // Replace all occurrences of decryption block
    while (newContent.includes(normalizedTarget)) {
        newContent = newContent.replace(normalizedTarget, normalizedReplacement);
    }
    
    // Fix usages
    newContent = newContent.replace(/updateData = normalizePaths\(req\.body\);/g, `updateData = (decryptedData && Object.keys(decryptedData).length > 0) ? normalizePaths(decryptedData) : normalizePaths(req.body);`);
    newContent = newContent.replace(/let payload = normalizePaths\(req\.body\);/g, `let payload = (decryptedData && Object.keys(decryptedData).length > 0) ? normalizePaths(decryptedData) : normalizePaths(req.body);`);

    fs.writeFileSync(filePath, newContent);
    console.log('Successfully updated programsPageControllerA.js');
} else {
    console.error('Target not found in programsPageControllerA.js');
}
