const path = require('path');
const fs = require('fs');

const PUBLIC_DIR = path.join(__dirname, 'jenil', 'public');
const ROOT_DIR = __dirname;

const files = [
    'public/home/slide_4.webp',
    'public/Programs/cricpro.png',
    'public/Programs/badpro.png',
    'public/home/bg_image.png'
];

files.forEach(f => {
    let rel = f.replace(/^public\//, '');
    let p1 = path.join(ROOT_DIR, rel);
    let p2 = path.join(PUBLIC_DIR, rel);
    console.log(`Checking ${f}:`);
    console.log(`  Rel: ${rel}`);
    console.log(`  P1: ${p1} status: ${fs.existsSync(p1)}`);
    console.log(`  P2: ${p2} status: ${fs.existsSync(p2)}`);
});
