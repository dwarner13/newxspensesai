import fs from 'fs';
import path from 'path';

function fixMalformedJSX(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Fix malformed JSX fragments in function calls
    const malformedFragmentRegex = /(\w+)\s*<\/>\s*\}\)/g;
    if (malformedFragmentRegex.test(content)) {
      content = content.replace(malformedFragmentRegex, '$1})');
      modified = true;
    }

    // Fix malformed JSX fragments in object literals
    const malformedObjectRegex = /(\w+)\s*<\/>\s*\}/g;
    if (malformedObjectRegex.test(content)) {
      content = content.replace(malformedObjectRegex, '$1}');
      modified = true;
    }

    // Fix malformed JSX fragments in array literals
    const malformedArrayRegex = /(\w+)\s*<\/>\s*\]/g;
    if (malformedArrayRegex.test(content)) {
      content = content.replace(malformedArrayRegex, '$1]');
      modified = true;
    }

    // Fix malformed JSX fragments in string literals
    const malformedStringRegex = /(\w+)\s*<\/>\s*"/g;
    if (malformedStringRegex.test(content)) {
      content = content.replace(malformedStringRegex, '$1"');
      modified = true;
    }

    // Fix malformed JSX fragments in template literals
    const malformedTemplateRegex = /(\w+)\s*<\/>\s*`/g;
    if (malformedTemplateRegex.test(content)) {
      content = content.replace(malformedTemplateRegex, '$1`');
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed malformed JSX: ${filePath}`);
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
      fixMalformedJSX(fullPath);
    }
  });
}

// Process src directory
processDirectory('./src');
console.log('🎉 Finished fixing malformed JSX!');




