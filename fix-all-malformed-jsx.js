import fs from 'fs';
import path from 'path';

function fixAllMalformedJSX(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Fix all malformed JSX fragments - more comprehensive approach
    const patterns = [
      // Fix malformed fragments in function calls
      { regex: /(\w+)\s*<\/>\s*\}\)/g, replacement: '$1})' },
      // Fix malformed fragments in object literals
      { regex: /(\w+)\s*<\/>\s*\}/g, replacement: '$1}' },
      // Fix malformed fragments in array literals
      { regex: /(\w+)\s*<\/>\s*\]/g, replacement: '$1]' },
      // Fix malformed fragments in string literals
      { regex: /(\w+)\s*<\/>\s*"/g, replacement: '$1"' },
      // Fix malformed fragments in template literals
      { regex: /(\w+)\s*<\/>\s*`/g, replacement: '$1`' },
      // Fix malformed fragments in semicolons
      { regex: /(\w+)\s*<\/>\s*;/g, replacement: '$1;' },
      // Fix malformed fragments in commas
      { regex: /(\w+)\s*<\/>\s*,/g, replacement: '$1,' },
      // Fix malformed fragments in parentheses
      { regex: /(\w+)\s*<\/>\s*\)/g, replacement: '$1)' },
      // Fix malformed fragments in brackets
      { regex: /(\w+)\s*<\/>\s*\]/g, replacement: '$1]' },
      // Fix malformed fragments in braces
      { regex: /(\w+)\s*<\/>\s*\}/g, replacement: '$1}' },
      // Fix malformed fragments in angle brackets
      { regex: /(\w+)\s*<\/>\s*>/g, replacement: '$1>' },
      // Fix malformed fragments in less than
      { regex: /(\w+)\s*<\/>\s*</g, replacement: '$1<' },
      // Fix malformed fragments in equals
      { regex: /(\w+)\s*<\/>\s*=/g, replacement: '$1=' },
      // Fix malformed fragments in plus
      { regex: /(\w+)\s*<\/>\s*\+/g, replacement: '$1+' },
      // Fix malformed fragments in minus
      { regex: /(\w+)\s*<\/>\s*-/g, replacement: '$1-' },
      // Fix malformed fragments in asterisk
      { regex: /(\w+)\s*<\/>\s*\*/g, replacement: '$1*' },
      // Fix malformed fragments in slash
      { regex: /(\w+)\s*<\/>\s*\//g, replacement: '$1/' },
      // Fix malformed fragments in percent
      { regex: /(\w+)\s*<\/>\s*%/g, replacement: '$1%' },
      // Fix malformed fragments in exclamation
      { regex: /(\w+)\s*<\/>\s*!/g, replacement: '$1!' },
      // Fix malformed fragments in question mark
      { regex: /(\w+)\s*<\/>\s*\?/g, replacement: '$1?' },
      // Fix malformed fragments in colon
      { regex: /(\w+)\s*<\/>\s*:/g, replacement: '$1:' },
      // Fix malformed fragments in pipe
      { regex: /(\w+)\s*<\/>\s*\|/g, replacement: '$1|' },
      // Fix malformed fragments in ampersand
      { regex: /(\w+)\s*<\/>\s*&/g, replacement: '$1&' },
      // Fix malformed fragments in caret
      { regex: /(\w+)\s*<\/>\s*\^/g, replacement: '$1^' },
      // Fix malformed fragments in tilde
      { regex: /(\w+)\s*<\/>\s*~/g, replacement: '$1~' },
      // Fix malformed fragments in backtick
      { regex: /(\w+)\s*<\/>\s*`/g, replacement: '$1`' },
      // Fix malformed fragments in single quote
      { regex: /(\w+)\s*<\/>\s*'/g, replacement: "$1'" },
      // Fix malformed fragments in double quote
      { regex: /(\w+)\s*<\/>\s*"/g, replacement: '$1"' },
      // Fix malformed fragments in newline
      { regex: /(\w+)\s*<\/>\s*\n/g, replacement: '$1\n' },
      // Fix malformed fragments in tab
      { regex: /(\w+)\s*<\/>\s*\t/g, replacement: '$1\t' },
      // Fix malformed fragments in space
      { regex: /(\w+)\s*<\/>\s* /g, replacement: '$1 ' },
    ];

    patterns.forEach(({ regex, replacement }) => {
      if (regex.test(content)) {
        content = content.replace(regex, replacement);
        modified = true;
      }
    });

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
      fixAllMalformedJSX(fullPath);
    }
  });
}

// Process src directory
processDirectory('./src');
console.log('🎉 Finished fixing all malformed JSX!');

