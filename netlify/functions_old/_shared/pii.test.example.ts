/**
 * Example usage of PII masking helper
 * 
 * To run: node --loader ts-node/esm pii.test.example.ts
 * Or integrate with your test framework
 */

import { maskPII, containsPII, countPII } from './pii';

// Example 1: Basic masking
const text1 = "My credit card is 4532-1234-5678-9012 and SSN is 123-45-6789";
const result1 = maskPII(text1);
console.log('Original:', text1);
console.log('Masked:', result1.masked);
console.log('Found:', result1.found);
// Expected: "My credit card is ************9012 and SSN is ***-**-6789"

// Example 2: Email masking
const text2 = "Contact me at john.doe@example.com or call (555) 123-4567";
const result2 = maskPII(text2);
console.log('\nOriginal:', text2);
console.log('Masked:', result2.masked);
console.log('Found:', result2.found);

// Example 3: Quick PII check
const hasPI = containsPII("My email is test@test.com");
console.log('\nContains PII?', hasPI); // true

const noPII = containsPII("This is a safe message with no personal info");
console.log('Contains PII?', noPII); // false

// Example 4: Count PII instances
const counts = countPII("Email: a@b.com, Phone: 123-456-7890, Card: 4532123456789012");
console.log('\nPII counts:', counts);
// Expected: { email: 1, phone_na: 1, us_credit_card: 1 }

// Example 5: Different masking strategies
const cardText = "Card: 4532-1234-5678-9012";
console.log('\nLast4 strategy:', maskPII(cardText, 'last4').masked);
console.log('Full strategy:', maskPII(cardText, 'full').masked);

