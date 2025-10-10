import fs from 'fs';
import path from 'path';

function removeFramerMotionFromFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Remove framer-motion imports
    const importRegex = /import\s+.*\s+from\s+['"]framer-motion['"];?\s*\n?/g;
    if (importRegex.test(content)) {
      content = content.replace(importRegex, '');
      modified = true;
    }

    // Replace motion. components with div
    const motionDivRegex = /<motion\.div/g;
    if (motionDivRegex.test(content)) {
      content = content.replace(motionDivRegex, '<div');
      modified = true;
    }

    const motionDivCloseRegex = /<\/motion\.div>/g;
    if (motionDivCloseRegex.test(content)) {
      content = content.replace(motionDivCloseRegex, '</div>');
      modified = true;
    }

    // Replace other motion components
    const motionComponents = ['h1', 'h2', 'h3', 'p', 'span', 'button', 'section', 'article', 'header', 'footer', 'main', 'aside', 'nav'];
    motionComponents.forEach(component => {
      const regex = new RegExp(`<motion\\.${component}`, 'g');
      if (regex.test(content)) {
        content = content.replace(regex, `<${component}`);
        modified = true;
      }
      
      const closeRegex = new RegExp(`</motion\\.${component}>`, 'g');
      if (closeRegex.test(content)) {
        content = content.replace(closeRegex, `</${component}>`);
        modified = true;
      }
    });

    // Remove AnimatePresence
    content = content.replace(/<AnimatePresence>/g, '');
    content = content.replace(/<\/AnimatePresence>/g, '');

    // Remove motion props
    const motionProps = ['initial', 'animate', 'exit', 'whileInView', 'transition', 'variants', 'custom'];
    motionProps.forEach(prop => {
      const regex = new RegExp(`\\s+${prop}=\\{\\{[^}]+\\}\\}`, 'g');
      if (regex.test(content)) {
        content = content.replace(regex, '');
        modified = true;
      }
    });

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Modified: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

function processDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);
  
  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      processDirectory(fullPath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.jsx') || file.endsWith('.js')) {
      removeFramerMotionFromFile(fullPath);
    }
  });
}

// Process src directory
processDirectory('./src');
console.log('🎉 Finished removing framer-motion from all files!');






