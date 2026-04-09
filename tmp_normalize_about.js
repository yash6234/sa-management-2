const fs = require('fs');
const filePath = 'e:/sa-management-2/jenil/controllers/aboutAcademyController.js';

let content = fs.readFileSync(filePath, 'utf8');

// 1. Remove the imports of enc_dec_c and redundant line 3/4
content = content.replace(/const \{ logger, decryptData \} = require\("\.\.\/\.\.\/utils\/enc_dec_c"\);/g, '');
content = content.replace(/const \{ logger, decryptData \} = require\('\.\.\/\.\.\/utils\/enc_dec_c'\);/g, '');

// 2. Remove all try-decrypt blocks
const decryptBlockRegex = /try\s*{\s*try\s*{\s*const\s+encryptedData\s+=\s+req\.params\.data\s+\|\|\s+req\.body\.data\s+\|\|\s+req\.query\.data;\s*if\s*\(encryptedData\)\s*{\s*const\s+decryptedData\s+=\s+decryptData\(encryptedData\);\s*}\s*}\s*catch\s*\(e\)\s*{\s*}\s*}/g;
content = content.replace(decryptBlockRegex, '');

// Some blocks might have slight variations in whitespace
const decryptBlockRegex2 = /try\s*{\s*const\s+encryptedData\s+=\s+req\.params\.data\s+\|\|\s+req\.body\.data\s+\|\|\s+req\.query\.data;\s*if\s*\(encryptedData\)\s*{\s*const\s+decryptedData\s+=\s+decryptData\(encryptedData\);\s*}\s*}\s*catch\s*\(e\)\s*{\s*}\s*/g;
content = content.replace(decryptBlockRegex2, '');

// 3. Replace manual encryption responses
content = content.replace(/res\.status\(200\)\.json\(\{\s*encrypted:\s*true,\s*success:\s*true,\s*data:\s*encryptData\(([^)]+)\),\s*data1:\s*encryptData\([^)]+\)\s*\}\);/g, 'res.status(200).json({ success: true, data: $1 });');
content = content.replace(/res\.status\(200\)\.json\(\{\s*encrypted:\s*true,\s*success:\s*true,\s*data:\s*encryptData\(([^)]+)\)\s*\}\);/g, 'res.status(200).json({ success: true, data: $1 });');
content = content.replace(/res\.status\(200\)\.json\(\{\s*encrypted:\s*true,\s*success:\s*true,\s*data:\s*encryptData\(([^)]+)\),\s*data1:\s*encryptData\([^)]+\),\s*data2:\s*encryptData\(Date\.now\(\)\)\s*\}\);/g, 'res.status(200).json({ success: true, data: $1 });');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Normalized aboutAcademyController.js');
