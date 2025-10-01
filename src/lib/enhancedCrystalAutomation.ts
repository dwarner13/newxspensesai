/**
 * Enhanced Crystal (Predictive AI) Automation
 * 
 * This class provides financial forecasting and scenario modeling using comprehensive
 * data from all financial documents to predict future financial outcomes.
 */

import { ComprehensiveFinancialData, CreditReportData, PayStubData, DebtDocumentData } from './multiDocumentAnalysisEngine';

export interface FinancialForecast {
  personality: string;
  scenarios: FinancialScenario[];
  keyPredictions: KeyPrediction[];
  marketInsights: MarketInsight[];
  riskFactors: RiskFactor[];
  opportunityAlerts: OpportunityAlert[];
  confidence: ForecastConfidence;
}

export interface FinancialScenario {
  name: string;
  description: string;
  probability: number;
  timeline: string;
  outcomes: ScenarioOutcomes;
  assumptions: string[];
  recommendations: string[];
}

export interface ScenarioOutcomes {
  debtFreeDate: string;
  totalInterestPaid: number;
  creditScoreProjection: number;
  netWorth: number;
  monthlyCashflow: number;
  keyMilestones: ScenarioMilestone[];
}

export interface ScenarioMilestone {
  date: string;
  milestone: string;
  impact: string;
  probability: number;
}

export interface KeyPrediction {
  prediction: string;
  timeline: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  action: string;
  probability: number;
}

export interface MarketInsight {
  insight: string;
  relevance: string;
  impact: 'positive' | 'negative' | 'neutral';
  timeline: string;
  action: string;
}

export interface RiskFactor {
  risk: string;
  probability: number;
  impact: 'high' | 'medium' | 'low';
  mitigation: string;
  timeline: string;
}

export interface OpportunityAlert {
  opportunity: string;
  urgency: 'immediate' | 'soon' | 'future';
  potentialValue: number;
  requirements: string[];
  timeline: string;
  action: string;
}

export interface ForecastConfidence {
  overall: number;
  factors: ConfidenceFactor[];
  limitations: string[];
}

export interface ConfidenceFactor {
  factor: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  reason: string;
}

export interface PredictiveModel {
  modelType: 'debt_elimination' | 'credit_optimization' | 'cashflow_projection' | 'investment_growth';
  inputs: ModelInput[];
  outputs: ModelOutput[];
  accuracy: number;
  lastUpdated: string;
}

export interface ModelInput {
  variable: string;
  value: number;
  weight: number;
  source: string;
}

export interface ModelOutput {
  metric: string;
  predictedValue: number;
  confidence: number;
  timeline: string;
}

export class EnhancedCrystalAutomation {
  private analysisEngine: any; // MultiDocumentAnalysisEngine
  private predictiveModels: PredictiveModel[] = [];

  constructor(analysisEngine: any) {
    this.analysisEngine = analysisEngine;
    this.initializePredictiveModels();
  }

  /**
   * Create comprehensive financial forecast
   */
  async createFinancialForecast(completeFinancialData: ComprehensiveFinancialData): Promise<FinancialForecast> {
    const scenarios = await this.generateFinancialScenarios(completeFinancialData);
    const keyPredictions = await this.generateKeyPredictions(completeFinancialData);
    const marketInsights = await this.generateMarketInsights(completeFinancialData);
    const riskFactors = await this.assessRiskFactors(completeFinancialData);
    const opportunityAlerts = await this.identifyOpportunities(completeFinancialData);
    const confidence = await this.calculateForecastConfidence(completeFinancialData);

    return {
      personality: this.generateCrystalPersonality(completeFinancialData),
      scenarios,
      keyPredictions,
      marketInsights,
      riskFactors,
      opportunityAlerts,
      confidence
    };
  }

  /**
   * Generate multiple financial scenarios
   */
  private async generateFinancialScenarios(data: ComprehensiveFinancialData): Promise<FinancialScenario[]> {
    const scenarios: FinancialScenario[] = [];

    // Current Path Scenario
    scenarios.push({
      name: "Current Path",
      description: "If you continue with current financial habits and strategies",
      probability: 0.4,
      timeline: "36 months",
      outcomes: this.calculateCurrentPathOutcomes(data),
      assumptions: [
        "No changes to current spending patterns",
        "Minimum payments maintained",
        "No additional income sources",
        "Current interest rates maintained"
      ],
      recommendations: [
        "Consider implementing optimization strategies",
        "Review spending patterns for improvement opportunities"
      ]
    });

    // Blitz Strategy Scenario
    scenarios.push({
      name: "Blitz Strategy",
      description: "Following aggressive debt elimination plan with optimized payments",
      probability: 0.7,
      timeline: "18 months",
      outcomes: this.calculateBlitzStrategyOutcomes(data),
      assumptions: [
        "Extra payments applied to highest interest debt",
        "Spending optimized for debt elimination",
        "Tax optimization implemented",
        "Credit score improvements achieved"
      ],
      recommendations: [
        "Implement debt avalanche strategy",
        "Optimize cashflow for extra payments",
        "Monitor credit score improvements"
      ]
    });

    // Ultimate Optimization Scenario
    scenarios.push({
      name: "Ultimate Optimization",
      description: "Maximum optimization with balance transfers, refinancing, and income optimization",
      probability: 0.5,
      timeline: "12 months",
      outcomes: this.calculateUltimateOptimizationOutcomes(data),
      assumptions: [
        "Balance transfers to 0% APR cards",
        "Debt consolidation at optimal rates",
        "Tax optimization maximized",
        "Income optimization implemented",
        "Perfect payment history maintained"
      ],
      recommendations: [
        "Apply for balance transfer cards",
        "Pursue debt consolidation",
        "Implement comprehensive tax strategy",
        "Consider income optimization opportunities"
      ]
    });

    return scenarios;
  }

  /**
   * Generate key predictions based on financial data
   */
  private async generateKeyPredictions(data: ComprehensiveFinancialData): Promise<KeyPrediction[]> {
    const predictions: KeyPrediction[] = [];

    // Credit score predictions
    const creditScorePrediction = this.predictCreditScore(data);
    predictions.push({
      prediction: `Credit score will reach ${creditScorePrediction.score} by ${creditScorePrediction.timeline}`,
      timeline: creditScorePrediction.timeline,
      confidence: creditScorePrediction.confidence,
      impact: 'high',
      action: "Monitor credit utilization and payment history",
      probability: creditScorePrediction.probability});

    // Refinancing opportunity
    const refinancingPrediction = this.predictRefinancingOpportunity(data);
    if (refinancingPrediction.available) {
      predictions.push({
        prediction: `Refinancing opportunity will be available in ${refinancingPrediction.timeline}`,
        timeline: refinancingPrediction.timeline,
        confidence: refinancingPrediction.confidence,
        impact: 'high',
        action: "Prepare for refinancing application",
        probability: refinancingPrediction.probability});
    }

    // Tax refund prediction
    const taxRefundPrediction = this.predictTaxRefund(data);
    predictions.push({
      prediction: `Tax refund of $${taxRefundPrediction.amount} expected in ${taxRefundPrediction.timeline}`,
      timeline: taxRefundPrediction.timeline,
      confidence: taxRefundPrediction.confidence,
      impact: 'medium',
      action: "Plan tax refund allocation for debt elimination",
      probability: taxRefundPrediction.probability});

    // Income growth prediction
    const incomeGrowthPrediction = this.predictIncomeGrowth(data);
    predictions.push({
      prediction: `Income growth of ${incomeGrowthPrediction.percentage}% expected by ${incomeGrowthPrediction.timeline}`,
      timeline: incomeGrowthPrediction.timeline,
      confidence: incomeGrowthPrediction.confidence,
      impact: 'medium',
      action: "Plan for increased debt payment capacity",
      probability: incomeGrowthPrediction.probability});

    return predictions;
  }

  /**
   * Generate market insights relevant to user's situation
   */
  private async generateMarketInsights(data: ComprehensiveFinancialData): Promise<MarketInsight[]> {
    const insights: MarketInsight[] = [];

    // Interest rate environment
    insights.push({
      insight: "Current interest rate environment favors debt consolidation",
      relevance: "Your debt consolidation strategy",
      impact: 'positive',
      timeline: "Next 6 months",
      action: "Consider accelerating consolidation applications"
    });

    // Credit market conditions
    insights.push({
      insight: "Credit card companies are offering competitive balance transfer rates",
      relevance: "Your high-interest credit card debt",
      impact: 'positive',
      timeline: "Next 3 months",
      action: "Research and apply for balance transfer cards"
    });

    // Economic indicators
    insights.push({
      insight: "Economic stability supports aggressive debt elimination strategies",
      relevance: "Your overall financial strategy",
      impact: 'positive',
      timeline: "Next 12 months",
      action: "Maintain aggressive debt payment approach"
    });

    return insights;
  }

  /**
   * Assess risk factors that could impact financial goals
   */
  private async assessRiskFactors(data: ComprehensiveFinancialData): Promise<RiskFactor[]> {
    const risks: RiskFactor[] = [];

    // Income risk
    const incomeStability = this.assessIncomeStability(data.payStubs);
    if (incomeStability < 0.8) {
      risks.push({
        risk: "Income instability",
        probability: 0.3,
        impact: 'high',
        mitigation: "Build emergency fund and diversify income sources",
        timeline: "Ongoing"
      });
    }

    // Interest rate risk
    risks.push({
      risk: "Rising interest rates",
      probability: 0.4,
      impact: 'medium',
      mitigation: "Lock in low rates through consolidation",
      timeline: "Next 12 months"
    });

    // Credit risk
    const creditRisk = this.assessCreditRisk(data.creditReport);
    if (creditRisk > 0.3) {
      risks.push({
        risk: "Credit score deterioration",
        probability: creditRisk,
        impact: 'high',
        mitigation: "Maintain perfect payment history and low utilization",
        timeline: "Ongoing"
      });
    }

    return risks;
  }

  /**
   * Identify opportunities for financial optimization
   */
  private async identifyOpportunities(data: ComprehensiveFinancialData): Promise<OpportunityAlert[]> {
    const opportunities: OpportunityAlert[] = [];

    // Balance transfer opportunity
    if (data.creditReport && data.creditReport.creditScore >= 700) {
      opportunities.push({
        opportunity: "0% Balance Transfer Cards Available",
        urgency: 'soon',
        potentialValue: this.calculateBalanceTransferValue(data),
        requirements: ["Credit score 700+", "Available credit"],
        timeline: "Next 30 days",
        action: "Apply for balance transfer cards"
      });
    }

    // Tax optimization opportunity
    const taxOptimization = this.identifyTaxOptimization(data);
    if (taxOptimization.available) {
      opportunities.push({
        opportunity: "Tax Withholding Optimization",
        urgency: 'immediate',
        potentialValue: taxOptimization.value,
        requirements: ["W4 form access", "Tax situation understanding"],
        timeline: "Next pay period",
        action: "Adjust W4 withholding"
      });
    }

    // Refinancing opportunity
    const refinancingOpportunity = this.identifyRefinancingOpportunity(data);
    if (refinancingOpportunity.available) {
      opportunities.push({
        opportunity: "Debt Consolidation Loan",
        urgency: 'soon',
        potentialValue: refinancingOpportunity.value,
        requirements: ["Credit score 650+", "Stable income"],
        timeline: "Next 60 days",
        action: "Apply for consolidation loan"
      });
    }

    return opportunities;
  }

  /**
   * Calculate forecast confidence
   */
  private async calculateForecastConfidence(data: ComprehensiveFinancialData): Promise<ForecastConfidence> {
    const factors: ConfidenceFactor[] = [];

    // Data completeness factor
    const dataCompleteness = this.assessDataCompleteness(data);
    factors.push({
      factor: "Data Completeness",
      confidence: dataCompleteness,
      impact: 'high',
      reason: "More complete data leads to more accurate predictions"
    });

    // Historical consistency factor
    const historicalConsistency = this.assessHistoricalConsistency(data);
    factors.push({
      factor: "Historical Consistency",
      confidence: historicalConsistency,
      impact: 'medium',
      reason: "Consistent patterns improve prediction accuracy"
    });

    // Market stability factor
    const marketStability = this.assessMarketStability();
    factors.push({
      factor: "Market Stability",
      confidence: marketStability,
      impact: 'medium',
      reason: "Stable market conditions improve forecast reliability"
    });

    const overallConfidence = factors.reduce((sum, factor) => sum + factor.confidence, 0) / factors.length;

    return {
      overall: overallConfidence,
      factors,
      limitations: [
        "Predictions based on current data and assumptions",
        "Market conditions may change unexpectedly",
        "Personal circumstances may vary",
        "Interest rates and economic conditions are unpredictable"
      ]
    };
  }

  // Scenario calculation methods
  private calculateCurrentPathOutcomes(data: ComprehensiveFinancialData): ScenarioOutcomes {
    const totalDebt = data.debtDocuments.reduce((sum, doc) => sum + doc.currentBalance, 0);
    const averageRate = this.calculateAverageInterestRate(data.debtDocuments);
    const monthlyPayment = data.debtDocuments.reduce((sum, doc) => sum + doc.minimumPayment, 0);
    
    const monthsToPayoff = this.calculatePayoffTime(totalDebt, monthlyPayment, averageRate);
    const totalInterest = this.calculateTotalInterest(totalDebt, monthlyPayment, averageRate);
    
    const debtFreeDate = this.calculateDateFromMonths(monthsToPayoff);
    const creditScoreProjection = this.projectCreditScore(data.creditReport?.creditScore || 0, monthsToPayoff, false);

    return {
      debtFreeDate,
      totalInterestPaid: totalInterest,
      creditScoreProjection,
      netWorth: this.calculateNetWorth(data, monthsToPayoff),
      monthlyCashflow: this.calculateMonthlyCashflow(data.payStubs),
      keyMilestones: this.generateCurrentPathMilestones(monthsToPayoff)
    };
  }

  private calculateBlitzStrategyOutcomes(data: ComprehensiveFinancialData): ScenarioOutcomes {
    const totalDebt = data.debtDocuments.reduce((sum, doc) => sum + doc.currentBalance, 0);
    const averageRate = this.calculateAverageInterestRate(data.debtDocuments);
    const extraPaymentCapacity = this.calculateExtraPaymentCapacity(data);
    const monthlyPayment = data.debtDocuments.reduce((sum, doc) => sum + doc.minimumPayment, 0) + extraPaymentCapacity;
    
    const monthsToPayoff = this.calculatePayoffTime(totalDebt, monthlyPayment, averageRate);
    const totalInterest = this.calculateTotalInterest(totalDebt, monthlyPayment, averageRate);
    
    const debtFreeDate = this.calculateDateFromMonths(monthsToPayoff);
    const creditScoreProjection = this.projectCreditScore(data.creditReport?.creditScore || 0, monthsToPayoff, true);

    return {
      debtFreeDate,
      totalInterestPaid: totalInterest,
      creditScoreProjection,
      netWorth: this.calculateNetWorth(data, monthsToPayoff),
      monthlyCashflow: this.calculateMonthlyCashflow(data.payStubs) + extraPaymentCapacity,
      keyMilestones: this.generateBlitzStrategyMilestones(monthsToPayoff)
    };
  }

  private calculateUltimateOptimizationOutcomes(data: ComprehensiveFinancialData): ScenarioOutcomes {
    const totalDebt = data.debtDocuments.reduce((sum, doc) => sum + doc.currentBalance, 0);
    const optimizedRate = 6.5; // Assumed optimized rate
    const extraPaymentCapacity = this.calculateExtraPaymentCapacity(data) * 1.2; // 20% more with optimization
    const monthlyPayment = data.debtDocuments.reduce((sum, doc) => sum + doc.minimumPayment, 0) + extraPaymentCapacity;
    
    const monthsToPayoff = this.calculatePayoffTime(totalDebt, monthlyPayment, optimizedRate);
    const totalInterest = this.calculateTotalInterest(totalDebt, monthlyPayment, optimizedRate);
    
    const debtFreeDate = this.calculateDateFromMonths(monthsToPayoff);
    const creditScoreProjection = this.projectCreditScore(data.creditReport?.creditScore || 0, monthsToPayoff, true);

    return {
      debtFreeDate,
      totalInterestPaid: totalInterest,
      creditScoreProjection,
      netWorth: this.calculateNetWorth(data, monthsToPayoff),
      monthlyCashflow: this.calculateMonthlyCashflow(data.payStubs) + extraPaymentCapacity,
      keyMilestones: this.generateUltimateOptimizationMilestones(monthsToPayoff)
    };
  }

  // Prediction methods
  private predictCreditScore(data: ComprehensiveFinancialData): { score: number; timeline: string; confidence: number; probability: number } {
    const currentScore = data.creditReport?.creditScore || 0;
    const utilization = data.creditReport?.utilization.overall || 0;
    
    let projectedScore = currentScore;
    let monthsToTarget = 6;
    
    if (utilization > 30) {
      projectedScore += Math.min(50, (utilization - 30) * 2);
      monthsToTarget = 3;
    }
    
    projectedScore += 20; // Payment history improvement
    projectedScore += 10; // Account age improvement
    
    return {
      score: Math.min(850, projectedScore),
      timeline: `${monthsToTarget} months`,
      confidence: 0.8,
      probability: 0.7
    };
  }

  private predictRefinancingOpportunity(data: ComprehensiveFinancialData): { available: boolean; timeline: string; confidence: number; probability: number } {
    const creditScore = data.creditReport?.creditScore || 0;
    const currentScore = creditScore;
    const targetScore = 700;
    
    if (currentScore >= targetScore) {
      return {
        available: true,
        timeline: "Immediate",
        confidence: 0.9,
        probability: 0.8
      };
    }
    
    const scoreGap = targetScore - currentScore;
    const monthsToTarget = Math.ceil(scoreGap / 10); // Assume 10 points per month improvement
    
    return {
      available: false,
      timeline: `${monthsToTarget} months`,
      confidence: 0.7,
      probability: 0.6
    };
  }

  private predictTaxRefund(data: ComprehensiveFinancialData): { amount: number; timeline: string; confidence: number; probability: number } {
    const payStubs = data.payStubs;
    if (payStubs.length === 0) {
      return { amount: 0, timeline: "N/A", confidence: 0, probability: 0 };
    }
    
    const latestPayStub = payStubs[0];
    const federalTax = latestPayStub.deductions.find(d => d.type === 'federal_tax')?.amount || 0;
    const grossPay = latestPayStub.grossPay;
    
    // Estimate annual refund based on overwithholding
    const annualGross = grossPay * (latestPayStub.payFrequency === 'weekly' ? 52 : 
                                  latestPayStub.payFrequency === 'bi-weekly' ? 26 :
                                  latestPayStub.payFrequency === 'semi-monthly' ? 24 : 12);
    
    const estimatedTax = annualGross * 0.22; // Assume 22% tax rate
    const estimatedWithholding = federalTax * (latestPayStub.payFrequency === 'weekly' ? 52 : 
                                             latestPayStub.payFrequency === 'bi-weekly' ? 26 :
                                             latestPayStub.payFrequency === 'semi-monthly' ? 24 : 12);
    
    const refund = Math.max(0, estimatedWithholding - estimatedTax);
    
    return {
      amount: Math.round(refund),
      timeline: "March 2024",
      confidence: 0.6,
      probability: 0.8
    };
  }

  private predictIncomeGrowth(data: ComprehensiveFinancialData): { percentage: number; timeline: string; confidence: number; probability: number } {
    // Simplified income growth prediction
    return {
      percentage: 3,
      timeline: "12 months",
      confidence: 0.5,
      probability: 0.6
    };
  }

  // Helper methods
  private initializePredictiveModels(): void {
    this.predictiveModels = [
      {
        modelType: 'debt_elimination',
        inputs: [
          { variable: 'total_debt', value: 0, weight: 0.4, source: 'debt_documents' },
          { variable: 'monthly_payment', value: 0, weight: 0.3, source: 'debt_documents' },
          { variable: 'interest_rate', value: 0, weight: 0.3, source: 'debt_documents' }
        ],
        outputs: [
          { metric: 'payoff_time', predictedValue: 0, confidence: 0.8, timeline: 'months' },
          { metric: 'total_interest', predictedValue: 0, confidence: 0.7, timeline: 'total' }
        ],
        accuracy: 0.85,
        lastUpdated: new Date().toISOString()
      }
    ];
  }

  private calculateAverageInterestRate(debtDocs: DebtDocumentData[]): number {
    if (debtDocs.length === 0) return 0;
    const totalRate = debtDocs.reduce((sum, doc) => sum + doc.interestRate, 0);
    return totalRate / debtDocs.length;
  }

  private calculatePayoffTime(balance: number, payment: number, rate: number): number {
    if (payment <= 0) return 999;
    const monthlyRate = rate / 100 / 12;
    if (monthlyRate === 0) return Math.ceil(balance / payment);
    
    const months = -Math.log(1 - (balance * monthlyRate) / payment) / Math.log(1 + monthlyRate);
    return Math.ceil(months);
  }

  private calculateTotalInterest(balance: number, payment: number, rate: number): number {
    const months = this.calculatePayoffTime(balance, payment, rate);
    const totalPaid = months * payment;
    return totalPaid - balance;
  }

  private calculateDateFromMonths(months: number): string {
    const date = new Date();
    date.setMonth(date.getMonth() + months);
    return date.toLocaleDateString();
  }

  private projectCreditScore(currentScore: number, months: number, optimized: boolean): number {
    let projectedScore = currentScore;
    
    if (optimized) {
      projectedScore += Math.min(100, months * 5); // Faster improvement with optimization
    } else {
      projectedScore += Math.min(50, months * 2); // Slower improvement without optimization
    }
    
    return Math.min(850, projectedScore);
  }

  private calculateNetWorth(data: ComprehensiveFinancialData, months: number): number {
    // Simplified net worth calculation
    const monthlyIncome = this.calculateMonthlyCashflow(data.payStubs);
    const totalDebt = data.debtDocuments.reduce((sum, doc) => sum + doc.currentBalance, 0);
    const debtReduction = Math.min(totalDebt, monthlyIncome * months * 0.3); // Assume 30% of income goes to debt
    
    return (monthlyIncome * months * 0.1) - (totalDebt - debtReduction); // Simplified calculation
  }

  private calculateMonthlyCashflow(payStubs: PayStubData[]): number {
    if (payStubs.length === 0) return 0;
    const latestPayStub = payStubs[0];
    const frequency = latestPayStub.payFrequency;
    
    switch (frequency) {
      case 'weekly': return latestPayStub.netPay * 4.33;
      case 'bi-weekly': return latestPayStub.netPay * 2.17;
      case 'semi-monthly': return latestPayStub.netPay * 2;
      case 'monthly': return latestPayStub.netPay;
      default: return latestPayStub.netPay * 2.17;
    }
  }

  private calculateExtraPaymentCapacity(data: ComprehensiveFinancialData): number {
    const monthlyIncome = this.calculateMonthlyCashflow(data.payStubs);
    const minimumPayments = data.debtDocuments.reduce((sum, doc) => sum + doc.minimumPayment, 0);
    const estimatedExpenses = monthlyIncome * 0.6; // Assume 60% for living expenses
    const discretionary = monthlyIncome - minimumPayments - estimatedExpenses;
    
    return Math.max(0, discretionary * 0.8); // Use 80% of discretionary for debt
  }

  private assessIncomeStability(payStubs: PayStubData[]): number {
    if (payStubs.length < 2) return 0.5;
    
    const incomes = payStubs.map(stub => stub.netPay);
    const average = incomes.reduce((sum, income) => sum + income, 0) / incomes.length;
    const variance = incomes.reduce((sum, income) => sum + Math.pow(income - average, 2), 0) / incomes.length;
    const stability = Math.max(0, 1 - (Math.sqrt(variance) / average));
    
    return stability;
  }

  private assessCreditRisk(creditReport: CreditReportData | undefined): number {
    if (!creditReport) return 0.5;
    
    let risk = 0;
    
    if (creditReport.creditScore < 600) risk += 0.4;
    if (creditReport.utilization.overall > 50) risk += 0.3;
    if (creditReport.inquiries.length > 3) risk += 0.2;
    if (creditReport.publicRecords.length > 0) risk += 0.3;
    
    return Math.min(1, risk);
  }

  private calculateBalanceTransferValue(data: ComprehensiveFinancialData): number {
    const creditCardDebt = data.debtDocuments
      .filter(doc => doc.documentType === 'credit_card_statement')
      .reduce((sum, doc) => sum + doc.currentBalance, 0);
    
    const averageRate = this.calculateAverageInterestRate(data.debtDocuments);
    return (averageRate / 100 / 12) * creditCardDebt * 12; // Annual savings
  }

  private identifyTaxOptimization(data: ComprehensiveFinancialData): { available: boolean; value: number } {
    const payStubs = data.payStubs;
    if (payStubs.length === 0) return { available: false, value: 0 };
    
    const latestPayStub = payStubs[0];
    const federalTax = latestPayStub.deductions.find(d => d.type === 'federal_tax')?.amount || 0;
    const grossPay = latestPayStub.grossPay;
    
    const expectedTaxRate = 0.22;
    const actualTaxRate = federalTax / grossPay;
    const overwithholding = Math.max(0, (actualTaxRate - expectedTaxRate) * grossPay);
    
    return {
      available: overwithholding > 50,
      value: overwithholding * 12 // Annual value
    };
  }

  private identifyRefinancingOpportunity(data: ComprehensiveFinancialData): { available: boolean; value: number } {
    const creditScore = data.creditReport?.creditScore || 0;
    const totalDebt = data.debtDocuments.reduce((sum, doc) => sum + doc.currentBalance, 0);
    const averageRate = this.calculateAverageInterestRate(data.debtDocuments);
    
    if (creditScore < 650 || totalDebt < 10000) {
      return { available: false, value: 0 };
    }
    
    const proposedRate = 6.5; // Assumed refinancing rate
    const monthlySavings = ((averageRate - proposedRate) / 100 / 12) * totalDebt;
    const annualSavings = monthlySavings * 12;
    
    return {
      available: true,
      value: annualSavings
    };
  }

  private assessDataCompleteness(data: ComprehensiveFinancialData): number {
    let completeness = 0;
    
    if (data.creditReport) completeness += 0.3;
    if (data.payStubs.length > 0) completeness += 0.3;
    if (data.debtDocuments.length > 0) completeness += 0.3;
    if (data.crossReferences) completeness += 0.1;
    
    return completeness;
  }

  private assessHistoricalConsistency(data: ComprehensiveFinancialData): number {
    // Simplified assessment - would need more historical data
    return 0.7;
  }

  private assessMarketStability(): number {
    // Simplified assessment - would need real market data
    return 0.8;
  }

  private generateCurrentPathMilestones(months: number): ScenarioMilestone[] {
    return [
      {
        date: `${Math.ceil(months * 0.25)} months`,
        milestone: "25% debt reduction",
        impact: "Credit utilization improvement",
        probability: 0.8
      },
      {
        date: `${Math.ceil(months * 0.5)} months`,
        milestone: "50% debt reduction",
        impact: "Significant credit score boost",
        probability: 0.7
      },
      {
        date: `${Math.ceil(months * 0.75)} months`,
        milestone: "75% debt reduction",
        impact: "Qualify for better rates",
        probability: 0.6
      }
    ];
  }

  private generateBlitzStrategyMilestones(months: number): ScenarioMilestone[] {
    return [
      {
        date: `${Math.ceil(months * 0.2)} months`,
        milestone: "First debt eliminated",
        impact: "Payment redirection to next target",
        probability: 0.9
      },
      {
        date: `${Math.ceil(months * 0.4)} months`,
        milestone: "Credit score improvement",
        impact: "Qualify for better rates",
        probability: 0.8
      },
      {
        date: `${Math.ceil(months * 0.6)} months`,
        milestone: "Major debt reduction",
        impact: "Significant interest savings",
        probability: 0.7
      }
    ];
  }

  private generateUltimateOptimizationMilestones(months: number): ScenarioMilestone[] {
    return [
      {
        date: `${Math.ceil(months * 0.15)} months`,
        milestone: "Balance transfers complete",
        impact: "0% interest on transferred debt",
        probability: 0.8
      },
      {
        date: `${Math.ceil(months * 0.3)} months`,
        milestone: "Consolidation loan secured",
        impact: "Reduced interest rates",
        probability: 0.7
      },
      {
        date: `${Math.ceil(months * 0.5)} months`,
        milestone: "Credit score optimization",
        impact: "Premium rate qualification",
        probability: 0.6
      }
    ];
  }

  private generateCrystalPersonality(data: ComprehensiveFinancialData): string {
    const creditScore = data.creditReport?.creditScore || 0;
    const totalDebt = data.debtDocuments.reduce((sum, doc) => sum + doc.currentBalance, 0);
    const monthlyIncome = this.calculateMonthlyCashflow(data.payStubs);
    
    if (creditScore >= 700 && totalDebt < monthlyIncome * 3) {
      return "The financial spirits show me three possible futures for you, and they're all quite promising! Your strong foundation creates multiple pathways to wealth and freedom.";
    } else if (creditScore >= 650) {
      return "The financial spirits reveal fascinating possibilities in your future. With the right strategies, you can transform your current situation into a powerful wealth-building engine.";
    } else {
      return "The financial spirits show me both challenges and incredible opportunities ahead. Your path to financial freedom is clear, though it will require dedication and strategic thinking.";
    }
  }
}

export default EnhancedCrystalAutomation;
