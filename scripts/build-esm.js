#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Create ESM build by copying CJS and renaming to .esm.js
const distDir = path.join(__dirname, '..', 'dist');
const esmDir = path.join(distDir, 'esm');

if (fs.existsSync(esmDir)) {
  // Copy main index file
  const cjsIndex = path.join(distDir, 'index.js');
  const esmIndex = path.join(distDir, 'index.esm.js');
  
  if (fs.existsSync(cjsIndex)) {
    let content = fs.readFileSync(cjsIndex, 'utf8');
    // Convert CommonJS exports to ESM
    content = content.replace(/module\.exports\s*=\s*/, 'export default ');
    content = content.replace(/exports\./g, 'export const ');
    fs.writeFileSync(esmIndex, content);
    console.log('✓ Created ESM build');
  }
}