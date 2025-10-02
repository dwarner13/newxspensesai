import fs from 'fs';
import path from 'path';

function fixJSXSyntax(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Fix missing opening tags before conditional rendering
    const conditionalRegex = /(\s+)(\{[^}]*&&\s*\(\))/g;
    if (conditionalRegex.test(content)) {
      content = content.replace(conditionalRegex, '$1<>$2');
      modified = true;
    }

    // Fix missing closing tags at the end
    const returnRegex = /(\s+return\s*\(\s*)(\{[^}]*&&\s*\([^)]*\)\s*\}\s*)(\s*\)\s*;)/g;
    if (returnRegex.test(content)) {
      content = content.replace(returnRegex, '$1<>$2</>$3');
      modified = true;
    }

    // Fix orphaned closing parentheses
    const orphanedCloseRegex = /(\s+)(\}\s*\)\s*;)/g;
    if (orphanedCloseRegex.test(content)) {
      content = content.replace(orphanedCloseRegex, '$1</>$2');
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed JSX syntax: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
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
      fixJSXSyntax(fullPath);
    }
  });
}

// Process src directory
processDirectory('./src');
console.log('🎉 Finished fixing JSX syntax!');


