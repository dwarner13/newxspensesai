const fs = require('fs');

// Check if fix_prime_ceo.cjs actually matched
const fc = 'netlify/functions/chat.ts';
const cc = fs.readFileSync(fc, 'utf8');
const hasTagRules = cc.includes('category_rules') && cc.includes('Tag\'s saved category rules');
const hasCEOPersona = cc.includes('PRIME CEO PERSONA');
console.log('category_rules query present:', hasTagRules);
console.log('CEO persona present:', hasCEOPersona);
