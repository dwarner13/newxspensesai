import fs from 'fs';
import path from 'path';

// Read the HomePage.tsx file
const filePath = 'src/pages/HomePage.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Replace all motion.div with div
content = content.replace(/motion\.div/g, 'div');
content = content.replace(/motion\.h1/g, 'h1');
content = content.replace(/motion\.p/g, 'p');
content = content.replace(/motion\.span/g, 'span');
content = content.replace(/motion\.button/g, 'button');
content = content.replace(/motion\.section/g, 'section');
content = content.replace(/motion\.article/g, 'article');
content = content.replace(/motion\.header/g, 'header');
content = content.replace(/motion\.footer/g, 'footer');
content = content.replace(/motion\.nav/g, 'nav');
content = content.replace(/motion\.main/g, 'main');
content = content.replace(/motion\.aside/g, 'aside');

// Remove AnimatePresence components and their children
content = content.replace(/<AnimatePresence[^>]*>[\s\S]*?<\/AnimatePresence>/g, '');

// Remove motion props (initial, animate, exit, transition, etc.)
content = content.replace(/\s+initial=\{[^}]*\}/g, '');
content = content.replace(/\s+animate=\{[^}]*\}/g, '');
content = content.replace(/\s+exit=\{[^}]*\}/g, '');
content = content.replace(/\s+transition=\{[^}]*\}/g, '');
content = content.replace(/\s+whileHover=\{[^}]*\}/g, '');
content = content.replace(/\s+whileTap=\{[^}]*\}/g, '');
content = content.replace(/\s+whileInView=\{[^}]*\}/g, '');
content = content.replace(/\s+viewport=\{[^}]*\}/g, '');
content = content.replace(/\s+layout/g, '');
content = content.replace(/\s+layoutId=\{[^}]*\}/g, '');

// Write the modified content back
fs.writeFileSync(filePath, content);

console.log('✅ Removed all framer-motion components from HomePage.tsx');
