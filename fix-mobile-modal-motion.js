import fs from 'fs';

// Read the MobileProfileModal.tsx file
const filePath = 'src/components/layout/MobileProfileModal.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Replace all motion components with regular HTML elements
content = content.replace(/motion\.div/g, 'div');
content = content.replace(/motion\.button/g, 'button');

// Remove motion props
content = content.replace(/\s+initial=\{[^}]*\}/g, '');
content = content.replace(/\s+animate=\{[^}]*\}/g, '');
content = content.replace(/\s+exit=\{[^}]*\}/g, '');
content = content.replace(/\s+transition=\{[^}]*\}/g, '');

// Write the modified content back
fs.writeFileSync(filePath, content);

console.log('✅ Removed all framer-motion components from MobileProfileModal.tsx');
