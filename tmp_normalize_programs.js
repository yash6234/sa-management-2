const fs = require('fs');
const filePath = 'e:/sa-management-2/jenil/controllers/programsPageController.js';

let content = fs.readFileSync(filePath, 'utf8');

// 1. Remove the imports of enc_dec_c and redundant line 3
content = content.replace(/const \{ logger, decryptData \} = require\("\.\.\/\.\.\/utils\/enc_dec_c"\);/g, '');
content = content.replace(/const \{ logger, decryptData \} = require\('\.\.\/\.\.\/utils\/enc_dec_c'\);/g, '');

// 2. Remove all try-decrypt blocks
const decryptBlockRegex = /try\s*{\s*try\s*{\s*const\s+encryptedData\s+=\s+req\.params\.data\s+\|\|\s+req\.body\.data\s+\|\|\s+req\.query\.data;\s*if\s*\(encryptedData\)\s*{\s*const\s+decryptedData\s+=\s+decryptData\(encryptedData\);\s*}\s*}\s*catch\s*\(e\)\s*{\s*}\s*}/g;
content = content.replace(decryptBlockRegex, '');

const decryptBlockRegex2 = /try\s*{\s*const\s+encryptedData\s+=\s+req\.params\.data\s+\|\|\s+req\.body\.data\s+\|\|\s+req\.query\.data;\s*if\s*\(encryptedData\)\s*{\s*const\s+decryptedData\s+=\s+decryptData\(encryptedData\);\s*}\s*}\s*catch\s*\(e\)\s*{\s*}\s*/g;
content = content.replace(decryptBlockRegex2, '');

// Also handle the commented out ones in getLevels
content = content.replace(/\/\/\s*try\s*{\s*\/\/\s*const\s+encryptedData\s+=\s+req\.params\.data\s+\|\|\s+req\.body\.data\s+\|\|\s+req\.query\.data;\s*\/\/\s*if\s*\(encryptedData\)\s*{\s*\/\/\s*const\s+decryptedData\s+=\s+decryptData\(encryptedData\);\s*\/\/\s*}\s*\/\/\s*}\s*catch\s*\(e\)\s*{\s*}\s*/g, '');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Normalized programsPageController.js');
