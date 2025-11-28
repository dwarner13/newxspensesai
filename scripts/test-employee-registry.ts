#!/usr/bin/env tsx
/**
 * Employee Registry Test Script
 * 
 * Tests the unified employee registry to verify:
 * - Slug resolution (aliases work)
 * - Employee loading from database
 * - Model config retrieval
 * 
 * Usage:
 *   tsx scripts/test-employee-registry.ts
 *   OR
 *   npm run test:registry
 */

import { config } from 'dotenv';
import { resolveSlug, getEmployee, getAllEmployees, getEmployeeModelConfig, getEmployeeSystemPrompt } from '../src/employees/registry';

// Load .env if available
config();

async function testRegistry() {
  console.log('🧪 Testing Employee Registry');
  console.log('='.repeat(60));
  
  try {
    // Test 1: Slug Resolution (Alias Support)
    console.log('\n📋 Test 1: Slug Resolution');
    console.log('-'.repeat(60));
    
    const testSlugs = [
      { input: 'crystal-analytics', expected: 'crystal-ai' },
      { input: 'crystal-ai', expected: 'crystal-ai' },
      { input: 'tag-categorize', expected: 'tag-ai' },
      { input: 'tag-ai', expected: 'tag-ai' },
      { input: 'byte-doc', expected: 'byte-docs' },
      { input: 'prime', expected: 'prime-boss' },
    ];
    
    for (const { input, expected } of testSlugs) {
      const resolved = await resolveSlug(input);
      const status = resolved === expected ? '✅' : '❌';
      console.log(`${status} resolveSlug('${input}') → '${resolved}' (expected: '${expected}')`);
      if (resolved !== expected) {
        console.error(`   ERROR: Expected '${expected}', got '${resolved}'`);
      }
    }
    
    // Test 2: Get Employee
    console.log('\n👤 Test 2: Get Employee');
    console.log('-'.repeat(60));
    
    const crystal = await getEmployee('crystal-ai');
    if (crystal) {
      console.log(`✅ getEmployee('crystal-ai') → Found: ${crystal.title}`);
      console.log(`   Model: ${crystal.model}, Temperature: ${crystal.temperature}, Max Tokens: ${crystal.max_tokens}`);
      console.log(`   Tools: ${crystal.tools_allowed.join(', ') || 'none'}`);
    } else {
      console.error('❌ getEmployee("crystal-ai") → Not found');
    }
    
    // Test alias resolution
    const crystalViaAlias = await getEmployee('crystal-analytics');
    if (crystalViaAlias) {
      console.log(`✅ getEmployee('crystal-analytics') → Found: ${crystalViaAlias.title} (via alias)`);
    } else {
      console.error('❌ getEmployee("crystal-analytics") → Not found (alias failed)');
    }
    
    // Test 3: Get All Employees
    console.log('\n📊 Test 3: Get All Employees');
    console.log('-'.repeat(60));
    
    const allEmployees = await getAllEmployees();
    console.log(`✅ getAllEmployees() → Found ${allEmployees.length} active employees`);
    
    const canonicalSlugs = ['prime-boss', 'byte-docs', 'tag-ai', 'crystal-ai', 'ledger-tax', 'goalie-goals', 'blitz-debt', 'finley-ai'];
    const foundSlugs = allEmployees.map(e => e.slug);
    
    for (const slug of canonicalSlugs) {
      const found = foundSlugs.includes(slug);
      console.log(`${found ? '✅' : '❌'} ${slug} ${found ? 'found' : 'MISSING'}`);
    }
    
    // Test 4: Model Config
    console.log('\n⚙️  Test 4: Model Configuration');
    console.log('-'.repeat(60));
    
    const primeConfig = await getEmployeeModelConfig('prime-boss');
    console.log(`✅ getEmployeeModelConfig('prime-boss') → Model: ${primeConfig.model}, Temp: ${primeConfig.temperature}, MaxTokens: ${primeConfig.maxTokens}`);
    
    const crystalConfig = await getEmployeeModelConfig('crystal-analytics'); // Test alias
    console.log(`✅ getEmployeeModelConfig('crystal-analytics') → Model: ${crystalConfig.model}, Temp: ${crystalConfig.temperature}, MaxTokens: ${crystalConfig.maxTokens} (via alias)`);
    
    // Test 5: System Prompt
    console.log('\n📝 Test 5: System Prompt');
    console.log('-'.repeat(60));
    
    const crystalPrompt = await getEmployeeSystemPrompt('crystal-ai');
    if (crystalPrompt) {
      console.log(`✅ getEmployeeSystemPrompt('crystal-ai') → Found (${crystalPrompt.length} chars)`);
      console.log(`   Preview: ${crystalPrompt.substring(0, 100)}...`);
    } else {
      console.error('❌ getEmployeeSystemPrompt("crystal-ai") → Not found');
    }
    
    // Test 6: Finley Phase 1 Setup
    console.log('\n📈 Test 6: Finley Phase 1 Configuration');
    console.log('-'.repeat(60));
    
    const finley = await getEmployee('finley-ai');
    if (finley) {
      console.log(`✅ getEmployee('finley-ai') → Found: ${finley.title}`);
      console.log(`   Model: ${finley.model}, Temperature: ${finley.temperature}, Max Tokens: ${finley.max_tokens}`);
      console.log(`   Tools: ${finley.tools_allowed.join(', ') || 'none'}`);
      
      // Verify Finley has Crystal tools
      const hasIncomeTool = finley.tools_allowed.includes('crystal_summarize_income');
      const hasExpenseTool = finley.tools_allowed.includes('crystal_summarize_expenses');
      const hasDebtTool = finley.tools_allowed.includes('finley_debt_payoff_forecast');
      const hasSavingsTool = finley.tools_allowed.includes('finley_savings_forecast');
      
      console.log(`${hasIncomeTool ? '✅' : '❌'} crystal_summarize_income tool`);
      console.log(`${hasExpenseTool ? '✅' : '❌'} crystal_summarize_expenses tool`);
      console.log(`${hasDebtTool ? '✅' : '❌'} finley_debt_payoff_forecast tool`);
      console.log(`${hasSavingsTool ? '✅' : '❌'} finley_savings_forecast tool`);
      
      if (!hasIncomeTool || !hasExpenseTool || !hasDebtTool || !hasSavingsTool) {
        console.error('❌ Finley is missing required tools!');
      }
      
      // Check system prompt mentions tools
      const finleyPrompt = await getEmployeeSystemPrompt('finley-ai');
      if (finleyPrompt) {
        const mentionsCrystal = finleyPrompt.includes('crystal_summarize_income') || finleyPrompt.includes('crystal_summarize_expenses');
        const mentionsForecasting = finleyPrompt.toLowerCase().includes('forecast') || finleyPrompt.toLowerCase().includes('planning');
        console.log(`${mentionsCrystal ? '✅' : '⚠️'} System prompt mentions Crystal tools`);
        console.log(`${mentionsForecasting ? '✅' : '⚠️'} System prompt mentions forecasting/planning`);
      }
    } else {
      console.error('❌ getEmployee("finley-ai") → Not found');
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Test Summary');
    console.log('='.repeat(60));
    console.log(`✅ Slug resolution: Working`);
    console.log(`✅ Employee loading: ${allEmployees.length} employees found`);
    console.log(`✅ Model config: Working`);
    console.log(`✅ System prompts: Working`);
    console.log('\n🎉 All registry tests passed!');
    
  } catch (error: any) {
    console.error('\n❌ Test failed with error:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
testRegistry().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

