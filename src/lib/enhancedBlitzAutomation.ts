/**
 * Enhanced Blitz (Debt Destroyer) Automation
 * 
 * This class provides comprehensive debt annihilation planning using the full financial picture
 * from credit reports, pay stubs, and debt documents.
 */

import { ComprehensiveFinancialData, CreditReportData, PayStubData, DebtDocumentData } from './multiDocumentAnalysisEngine';

export interface DebtAnnihilationPlan {
  personality: string;
  strategies: DebtStrategy[];
  immediateActions: string[];
  timeline: DebtTimeline;
  savings: DebtSavings;
  motivationalMessage: string;
}

export interface DebtStrategy {
  name: string;
  description: string;
  timeToFreedom: string;
  totalInterestSaved: number;
  personalityNote: string;
  monthlyPayment: number;
  priority: 'high' | 'medium' | 'low';
  requirements: string[];
  risks: string[];
}

export interface DebtTimeline {
  currentDebtFreeDate: string;
  optimizedDebtFreeDate: string;
  monthlyMilestones: MonthlyMilestone[];
  keyEvents: KeyEvent[];
}

export interface MonthlyMilestone {
  month: number;
  totalDebtRemaining: number;
  debtEliminated: number;
  creditScoreProjection: number;
  motivationalMessage: string;
}

export interface KeyEvent {
  date: string;
  event: string;
  impact: string;
  action: string;
}

export interface DebtSavings {
  totalInterestSaved: number;
  timeSaved: string;
  monthlySavings: number;
  creditScoreImprovement: number;
  breakdown: SavingsBreakdown[];
}

export interface SavingsBreakdown {
  category: string;
  amount: number;
  description: string;
}

export interface BlitzAnalysis {
  creditScore: number;
  utilization: number;
  availableCredit: number;
  monthlyIncome: number;
  incomeStability: number;
  taxWithholdings: number;
  debtInventory: DebtInventory[];
  interestRates: InterestRateAnalysis;
  minimumPayments: number;
  discretionarySpending: number;
  extraPaymentCapacity: number;
}

export interface DebtInventory {
  creditor: string;
  balance: number;
  interestRate: number;
  minimumPayment: number;
  priority: 'avalanche' | 'snowball' | 'hybrid';
  payoffTime: number; // months
  totalInterest: number;
}

export interface InterestRateAnalysis {
  average: number;
  highest: number;
  lowest: number;
  savingsOpportunity: number;
}

export class EnhancedBlitzAutomation {
  private analysisEngine: any; // MultiDocumentAnalysisEngine

  constructor(analysisEngine: any) {
    this.analysisEngine = analysisEngine;
  }

  /**
   * Create comprehensive debt annihilation plan
   */
  async createDebtAnnihilationPlan(
    creditReport: CreditReportData | undefined,
    payStubs: PayStubData[],
    debtDocs: DebtDocumentData[],
    spending?: any
  ): Promise<DebtAnnihilationPlan> {
    const analysis = await this.analyzeFinancialBattlefield(creditReport, payStubs, debtDocs, spending);
    const strategies = this.generateWarStrategies(analysis);
    const immediateActions = this.generateImmediateActions(analysis);
    const timeline = this.createDebtTimeline(analysis, strategies[0]);
    const savings = this.calculateSavings(analysis, strategies[0]);

    return {
      personality: this.generateBlitzPersonality(analysis),
      strategies,
      immediateActions,
      timeline,
      savings,
      motivationalMessage: this.generateMotivationalMessage(analysis, strategies[0])
    };
  }

  /**
   * Analyze the complete financial battlefield
   */
  private async analyzeFinancialBattlefield(
    creditReport: CreditReportData | undefined,
    payStubs: PayStubData[],
    debtDocs: DebtDocumentData[],
    spending?: any
  ): Promise<BlitzAnalysis> {
    return {
      creditScore: creditReport?.creditScore || 0,
      utilization: creditReport?.utilization.overall || 0,
      availableCredit: this.calculateAvailableCredit(creditReport),
      monthlyIncome: this.calculateNetIncome(payStubs),
      incomeStability: this.assessIncomeStability(payStubs),
      taxWithholdings: this.analyzeTaxEfficiency(payStubs),
      debtInventory: this.catalogAllDebts(debtDocs),
      interestRates: this.extractInterestRates(debtDocs),
      minimumPayments: this.calculateMinPayments(debtDocs),
      discretionarySpending: this.findExtraPaymentCapacity(spending),
      extraPaymentCapacity: this.calculateExtraPaymentCapacity(payStubs, debtDocs, spending)
    };
  }

  /**
   * Generate war strategies based on analysis
   */
  private generateWarStrategies(analysis: BlitzAnalysis): DebtStrategy[] {
    const strategies: DebtStrategy[] = [];

    // Avalanche Strategy (Highest Interest First)
    strategies.push({
      name: "Avalanche Assault",
      description: "Attack highest interest rate first for maximum efficiency",
      timeToFreedom: this.calculateAvalancheTime(analysis),
      totalInterestSaved: this.calculateAvalancheSavings(analysis),
      personalityNote: "This is for warriors who want maximum efficiency!",
      monthlyPayment: analysis.minimumPayments + analysis.extraPaymentCapacity,
      priority: 'high',
      requirements: ["Discipline to stick with the plan", "Focus on long-term savings"],
      risks: ["May take longer to see first victory", "Requires patience"]
    });

    // Snowball Strategy (Smallest Balance First)
    strategies.push({
      name: "Snowball Siege",
      description: "Crush smallest balances first for momentum",
      timeToFreedom: this.calculateSnowballTime(analysis),
      totalInterestSaved: this.calculateSnowballSavings(analysis),
      personalityNote: "Perfect for building unstoppable momentum!",
      monthlyPayment: analysis.minimumPayments + analysis.extraPaymentCapacity,
      priority: 'medium',
      requirements: ["Need for quick wins", "Motivation from early victories"],
      risks: ["May pay more interest overall", "Less mathematically optimal"]
    });

    // Balance Transfer Strategy
    if (analysis.creditScore >= 700 && analysis.availableCredit > 0) {
      strategies.push({
        name: "Balance Transfer Blitz",
        description: "Transfer to 0% APR cards using available credit",
        timeToFreedom: this.calculateBalanceTransferTime(analysis),
        totalInterestSaved: this.calculateBalanceTransferSavings(analysis),
        personalityNote: "TACTICAL MANEUVER using your excellent credit score!",
        monthlyPayment: analysis.minimumPayments + analysis.extraPaymentCapacity,
        priority: 'high',
        requirements: ["Good credit score (700+)", "Available credit for transfers"],
        risks: ["Transfer fees", "Rates may increase after promotional period"]
      });
    }

    // Hybrid Strategy
    strategies.push({
      name: "Hybrid Hammer",
      description: "Combine avalanche efficiency with snowball momentum",
      timeToFreedom: this.calculateHybridTime(analysis),
      totalInterestSaved: this.calculateHybridSavings(analysis),
      personalityNote: "The best of both worlds - efficiency AND momentum!",
      monthlyPayment: analysis.minimumPayments + analysis.extraPaymentCapacity,
      priority: 'medium',
      requirements: ["Balanced approach", "Flexibility in strategy"],
      risks: ["More complex to execute", "Requires careful planning"]
    });

    return strategies.sort((a, b) => b.totalInterestSaved - a.totalInterestSaved);
  }

  /**
   * Generate immediate actions based on analysis
   */
  private generateImmediateActions(analysis: BlitzAnalysis): string[] {
    const actions: string[] = [];

    // Income optimization
    if (analysis.taxWithholdings > 0) {
      actions.push(`Redirect $${analysis.taxWithholdings}/month from overwithholding to debt attacks`);
    }

    // Spending optimization
    if (analysis.discretionarySpending > 0) {
      actions.push(`Redirect $${Math.round(analysis.discretionarySpending * 0.3)}/month from discretionary spending to debt elimination`);
    }

    // Credit optimization
    if (analysis.utilization > 30) {
      actions.push(`Pay down highest utilization card to under 30% for immediate credit score boost`);
    }

    // Rate negotiation
    if (analysis.interestRates.average > 15) {
      actions.push(`Negotiate lower rates on high-interest debts (your ${analysis.creditScore} credit score gives you leverage!)`);
    }

    // Balance transfer opportunity
    if (analysis.creditScore >= 700 && analysis.availableCredit > 5000) {
      actions.push(`Apply for 0% balance transfer card to eliminate interest on highest-rate debt`);
    }

    // Tax refund strategy
    actions.push(`Use next tax refund as nuclear strike on highest-interest debt`);

    return actions;
  }

  /**
   * Create detailed debt elimination timeline
   */
  private createDebtTimeline(analysis: BlitzAnalysis, strategy: DebtStrategy): DebtTimeline {
    const totalDebt = analysis.debtInventory.reduce((sum, debt) => sum + debt.balance, 0);
    const monthlyPayment = strategy.monthlyPayment;
    const monthsToFreedom = Math.ceil(totalDebt / monthlyPayment);

    const milestones: MonthlyMilestone[] = [];
    let remainingDebt = totalDebt;

    for (let month = 1; month <= monthsToFreedom; month++) {
      remainingDebt = Math.max(0, remainingDebt - monthlyPayment);
      const debtEliminated = totalDebt - remainingDebt;
      const creditScoreProjection = this.projectCreditScore(analysis.creditScore, month, analysis);

      milestones.push({
        month,
        totalDebtRemaining: remainingDebt,
        debtEliminated,
        creditScoreProjection,
        motivationalMessage: this.generateMilestoneMessage(month, remainingDebt, creditScoreProjection)
      });
    }

    const keyEvents: KeyEvent[] = [
      {
        date: "Month 3",
        event: "First debt eliminated",
        impact: "Credit utilization improves",
        action: "Redirect payment to next target"
      },
      {
        date: "Month 6",
        event: "Credit score improvement",
        impact: "Qualify for better rates",
        action: "Consider refinancing opportunities"
      },
      {
        date: "Month 12",
        event: "Major milestone reached",
        impact: "Significant debt reduction",
        action: "Reassess strategy and accelerate"
      }
    ];

    return {
      currentDebtFreeDate: this.calculateCurrentDebtFreeDate(analysis),
      optimizedDebtFreeDate: this.calculateOptimizedDebtFreeDate(analysis, strategy),
      monthlyMilestones: milestones,
      keyEvents
    };
  }

  /**
   * Calculate total savings from debt elimination
   */
  private calculateSavings(analysis: BlitzAnalysis, strategy: DebtStrategy): DebtSavings {
    const totalInterestSaved = strategy.totalInterestSaved;
    const timeSaved = this.calculateTimeSaved(analysis, strategy);
    const monthlySavings = this.calculateMonthlySavings(analysis);
    const creditScoreImprovement = this.calculateCreditScoreImprovement(analysis);

    const breakdown: SavingsBreakdown[] = [
      {
        category: "Interest Elimination",
        amount: totalInterestSaved,
        description: "Total interest saved by paying off debt early"
      },
      {
        category: "Time Value",
        amount: this.calculateTimeValue(analysis, strategy),
        description: "Value of time saved in debt freedom"
      },
      {
        category: "Credit Score Boost",
        amount: this.calculateCreditScoreValue(creditScoreImprovement),
        description: "Financial value of improved credit score"
      }
    ];

    return {
      totalInterestSaved,
      timeSaved,
      monthlySavings,
      creditScoreImprovement,
      breakdown
    };
  }

  // Helper methods for calculations
  private calculateAvailableCredit(creditReport: CreditReportData | undefined): number {
    if (!creditReport) return 0;
    return creditReport.accounts.reduce((sum, account) => sum + account.availableCredit, 0);
  }

  private calculateNetIncome(payStubs: PayStubData[]): number {
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

  private assessIncomeStability(payStubs: PayStubData[]): number {
    if (payStubs.length < 2) return 0.5;
    
    const incomes = payStubs.map(stub => stub.netPay);
    const average = incomes.reduce((sum, income) => sum + income, 0) / incomes.length;
    const variance = incomes.reduce((sum, income) => sum + Math.pow(income - average, 2), 0) / incomes.length;
    const stability = Math.max(0, 1 - (Math.sqrt(variance) / average));
    
    return stability;
  }

  private analyzeTaxEfficiency(payStubs: PayStubData[]): number {
    if (payStubs.length === 0) return 0;
    
    const latestPayStub = payStubs[0];
    const federalTax = latestPayStub.deductions.find(d => d.type === 'federal_tax')?.amount || 0;
    const grossPay = latestPayStub.grossPay;
    
    // Simple tax efficiency calculation
    const expectedTaxRate = 0.22; // 22% bracket
    const actualTaxRate = federalTax / grossPay;
    const overwithholding = Math.max(0, (actualTaxRate - expectedTaxRate) * grossPay);
    
    return overwithholding;
  }

  private catalogAllDebts(debtDocs: DebtDocumentData[]): DebtInventory[] {
    return debtDocs.map(doc => ({
      creditor: doc.creditor,
      balance: doc.currentBalance,
      interestRate: doc.interestRate,
      minimumPayment: doc.minimumPayment,
      priority: 'avalanche' as const,
      payoffTime: this.calculatePayoffTime(doc.currentBalance, doc.minimumPayment, doc.interestRate),
      totalInterest: this.calculateTotalInterest(doc.currentBalance, doc.minimumPayment, doc.interestRate)
    }));
  }

  private extractInterestRates(debtDocs: DebtDocumentData[]): InterestRateAnalysis {
    const rates = debtDocs.map(doc => doc.interestRate);
    const average = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
    const highest = Math.max(...rates);
    const lowest = Math.min(...rates);
    
    return {
      average,
      highest,
      lowest,
      savingsOpportunity: (average - 6.5) * 1000 // Assuming 6.5% is achievable
    };
  }

  private calculateMinPayments(debtDocs: DebtDocumentData[]): number {
    return debtDocs.reduce((sum, doc) => sum + doc.minimumPayment, 0);
  }

  private findExtraPaymentCapacity(spending?: any): number {
    // This would analyze spending patterns to find extra payment capacity
    return 300; // Placeholder
  }

  private calculateExtraPaymentCapacity(payStubs: PayStubData[], debtDocs: DebtDocumentData[], spending?: any): number {
    const monthlyIncome = this.calculateNetIncome(payStubs);
    const minimumPayments = this.calculateMinPayments(debtDocs);
    const estimatedExpenses = monthlyIncome * 0.6; // Assume 60% for living expenses
    const discretionary = monthlyIncome - minimumPayments - estimatedExpenses;
    
    return Math.max(0, discretionary * 0.8); // Use 80% of discretionary for debt
  }

  // Strategy calculation methods
  private calculateAvalancheTime(analysis: BlitzAnalysis): string {
    const totalDebt = analysis.debtInventory.reduce((sum, debt) => sum + debt.balance, 0);
    const monthlyPayment = analysis.minimumPayments + analysis.extraPaymentCapacity;
    const months = Math.ceil(totalDebt / monthlyPayment);
    return `${months} months`;
  }

  private calculateAvalancheSavings(analysis: BlitzAnalysis): number {
    // Simplified calculation - would need more complex logic
    return analysis.interestRates.average * 1000;
  }

  private calculateSnowballTime(analysis: BlitzAnalysis): string {
    // Simplified calculation
    const totalDebt = analysis.debtInventory.reduce((sum, debt) => sum + debt.balance, 0);
    const monthlyPayment = analysis.minimumPayments + analysis.extraPaymentCapacity;
    const months = Math.ceil(totalDebt / monthlyPayment) + 2; // Snowball typically takes slightly longer
    return `${months} months`;
  }

  private calculateSnowballSavings(analysis: BlitzAnalysis): number {
    return analysis.interestRates.average * 800; // Slightly less than avalanche
  }

  private calculateBalanceTransferTime(analysis: BlitzAnalysis): string {
    const totalDebt = analysis.debtInventory.reduce((sum, debt) => sum + debt.balance, 0);
    const monthlyPayment = analysis.minimumPayments + analysis.extraPaymentCapacity;
    const months = Math.ceil(totalDebt / monthlyPayment) - 6; // Balance transfer saves time
    return `${Math.max(12, months)} months`;
  }

  private calculateBalanceTransferSavings(analysis: BlitzAnalysis): number {
    return analysis.interestRates.average * 1500; // Significant savings with 0% rate
  }

  private calculateHybridTime(analysis: BlitzAnalysis): string {
    const totalDebt = analysis.debtInventory.reduce((sum, debt) => sum + debt.balance, 0);
    const monthlyPayment = analysis.minimumPayments + analysis.extraPaymentCapacity;
    const months = Math.ceil(totalDebt / monthlyPayment) + 1;
    return `${months} months`;
  }

  private calculateHybridSavings(analysis: BlitzAnalysis): number {
    return analysis.interestRates.average * 900;
  }

  // Timeline calculation methods
  private calculateCurrentDebtFreeDate(analysis: BlitzAnalysis): string {
    const totalDebt = analysis.debtInventory.reduce((sum, debt) => sum + debt.balance, 0);
    const monthlyPayment = analysis.minimumPayments;
    const months = Math.ceil(totalDebt / monthlyPayment);
    const date = new Date();
    date.setMonth(date.getMonth() + months);
    return date.toLocaleDateString();
  }

  private calculateOptimizedDebtFreeDate(analysis: BlitzAnalysis, strategy: DebtStrategy): string {
    const totalDebt = analysis.debtInventory.reduce((sum, debt) => sum + debt.balance, 0);
    const monthlyPayment = strategy.monthlyPayment;
    const months = Math.ceil(totalDebt / monthlyPayment);
    const date = new Date();
    date.setMonth(date.getMonth() + months);
    return date.toLocaleDateString();
  }

  private projectCreditScore(currentScore: number, month: number, analysis: BlitzAnalysis): number {
    // Simplified credit score projection
    const utilizationImprovement = Math.max(0, (analysis.utilization - 30) * 0.5);
    const paymentHistoryImprovement = month * 2;
    const scoreImprovement = utilizationImprovement + paymentHistoryImprovement;
    
    return Math.min(850, currentScore + scoreImprovement);
  }

  private generateMilestoneMessage(month: number, remainingDebt: number, creditScore: number): string {
    if (month === 1) return "First month down! You're building unstoppable momentum!";
    if (month === 3) return "Three months in! Your credit score is already improving!";
    if (month === 6) return "Half a year of discipline! You're becoming a debt-destroying machine!";
    if (month === 12) return "One year of financial freedom fighting! You're unstoppable!";
    if (remainingDebt < 1000) return "Final stretch! You're almost debt-free!";
    return `Month ${month}: Keep crushing it! Your future self will thank you!`;
  }

  // Savings calculation methods
  private calculateTimeSaved(analysis: BlitzAnalysis, strategy: DebtStrategy): string {
    const currentTime = this.calculateCurrentDebtFreeDate(analysis);
    const optimizedTime = this.calculateOptimizedDebtFreeDate(analysis, strategy);
    // Simplified - would need actual date calculation
    return "18 months";
  }

  private calculateMonthlySavings(analysis: BlitzAnalysis): number {
    return analysis.minimumPayments;
  }

  private calculateCreditScoreImprovement(analysis: BlitzAnalysis): number {
    return Math.min(100, (100 - analysis.utilization) * 2);
  }

  private calculateTimeValue(analysis: BlitzAnalysis, strategy: DebtStrategy): number {
    // Simplified calculation of time value
    return strategy.totalInterestSaved * 0.3;
  }

  private calculateCreditScoreValue(improvement: number): number {
    // Simplified calculation of credit score value
    return improvement * 50;
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

  // Personality and messaging methods
  private generateBlitzPersonality(analysis: BlitzAnalysis): string {
    const debtTotal = analysis.debtInventory.reduce((sum, debt) => sum + debt.balance, 0);
    const monthlyIncome = analysis.monthlyIncome;
    
    if (debtTotal > monthlyIncome * 12) {
      return "LISTEN UP SOLDIER! I've analyzed your financial battlefield and this is WAR! Your debt is a formidable enemy, but I've got the battle plan to CRUSH IT!";
    } else if (debtTotal > monthlyIncome * 6) {
      return "ATTENTION WARRIOR! I've studied your financial situation and I see a clear path to VICTORY! Your debt is manageable, and with the right strategy, we'll eliminate it!";
    } else {
      return "HELLO CHAMPION! I've reviewed your financial data and you're in a great position! With some tactical moves, we can eliminate your debt quickly and efficiently!";
    }
  }

  private generateMotivationalMessage(analysis: BlitzAnalysis, strategy: DebtStrategy): string {
    const savings = strategy.totalInterestSaved;
    const timeToFreedom = strategy.timeToFreedom;
    
    return `SOLDIER! This plan will save you $${savings.toLocaleString()} in interest and get you debt-free in ${timeToFreedom}! That's money in YOUR pocket instead of the banks'! Are you ready to WIN this financial war?`;
  }
}

export default EnhancedBlitzAutomation;
