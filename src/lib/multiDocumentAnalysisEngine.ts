/**
 * Multi-Document Analysis Engine
 * 
 * This engine correlates data across different financial documents to provide
 * comprehensive financial analysis and enable advanced AI employee automations.
 */

export interface CreditReportData {
  creditScore: number;
  creditBureau: string;
  reportDate: string;
  accounts: CreditAccount[];
  inquiries: CreditInquiry[];
  publicRecords: PublicRecord[];
  personalInfo: PersonalInfo;
  utilization: UtilizationData;
}

export interface CreditAccount {
  accountName: string;
  accountType: 'credit_card' | 'loan' | 'mortgage' | 'other';
  balance: number;
  creditLimit: number;
  availableCredit: number;
  utilization: number;
  interestRate?: number;
  minimumPayment: number;
  paymentStatus: 'current' | 'late' | 'default';
  accountAge: number; // in months
  lastPaymentDate: string;
  accountStatus: 'open' | 'closed' | 'charged_off';
}

export interface CreditInquiry {
  date: string;
  company: string;
  type: 'hard' | 'soft';
  purpose: string;
}

export interface PublicRecord {
  type: 'bankruptcy' | 'lien' | 'judgment' | 'other';
  date: string;
  amount?: number;
  status: 'active' | 'released';
}

export interface PersonalInfo {
  name: string;
  address: string;
  ssn: string; // masked
  dateOfBirth: string;
}

export interface UtilizationData {
  overall: number;
  byAccount: { [accountName: string]: number };
  recommended: number;
}

export interface PayStubData {
  employeeName: string;
  employer: string;
  payPeriod: {
    start: string;
    end: string;
  };
  grossPay: number;
  deductions: Deduction[];
  netPay: number;
  yearToDate: {
    grossPay: number;
    netPay: number;
    taxesWithheld: number;
  };
  payFrequency: 'weekly' | 'bi-weekly' | 'semi-monthly' | 'monthly';
  hourlyRate?: number;
  hoursWorked?: number;
}

export interface Deduction {
  type: 'federal_tax' | 'state_tax' | 'social_security' | 'medicare' | 'health_insurance' | 'retirement' | 'other';
  description: string;
  amount: number;
  yearToDate: number;
}

export interface DebtDocumentData {
  documentType: 'credit_card_statement' | 'loan_statement' | 'mortgage_statement' | 'collection_letter';
  creditor: string;
  accountNumber: string;
  currentBalance: number;
  minimumPayment: number;
  interestRate: number;
  paymentDueDate: string;
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
  term?: number; // in months
  remainingPayments?: number;
  lateFees?: number;
  annualFee?: number;
  gracePeriod?: number; // in days
}

export interface ComprehensiveFinancialData {
  creditReport?: CreditReportData;
  payStubs: PayStubData[];
  debtDocuments: DebtDocumentData[];
  analysisTimestamp: string;
  crossReferences: CrossReferenceAnalysis;
  insights: FinancialInsights;
}

export interface CrossReferenceAnalysis {
  incomeDebtRatio: number;
  creditUtilizationImpact: number;
  paymentCapacity: number;
  refinancingEligibility: boolean;
  consolidationOpportunities: ConsolidationOpportunity[];
  discrepancies: DataDiscrepancy[];
}

export interface ConsolidationOpportunity {
  type: 'balance_transfer' | 'personal_loan' | 'home_equity' | 'debt_management';
  estimatedRate: number;
  currentAverageRate: number;
  potentialSavings: number;
  qualificationScore: number;
  requirements: string[];
}

export interface DataDiscrepancy {
  type: 'income_mismatch' | 'debt_mismatch' | 'payment_mismatch' | 'account_mismatch';
  description: string;
  severity: 'low' | 'medium' | 'high';
  recommendation: string;
}

export interface FinancialInsights {
  debtToIncomeRatio: number;
  creditScoreFactors: CreditScoreFactor[];
  cashFlowAnalysis: CashFlowAnalysis;
  optimizationOpportunities: OptimizationOpportunity[];
  riskAssessment: RiskAssessment;
}

export interface CreditScoreFactor {
  factor: string;
  impact: 'positive' | 'negative' | 'neutral';
  points: number;
  recommendation: string;
  priority: 'high' | 'medium' | 'low';
}

export interface CashFlowAnalysis {
  monthlyIncome: number;
  monthlyExpenses: number;
  discretionaryIncome: number;
  debtServiceRatio: number;
  emergencyFundStatus: 'adequate' | 'insufficient' | 'excessive';
  savingsRate: number;
}

export interface OptimizationOpportunity {
  category: 'credit' | 'debt' | 'income' | 'tax' | 'savings';
  opportunity: string;
  potentialSavings: number;
  effort: 'low' | 'medium' | 'high';
  timeline: string;
  requirements: string[];
}

export interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high';
  factors: RiskFactor[];
  recommendations: string[];
}

export interface RiskFactor {
  factor: string;
  riskLevel: 'low' | 'medium' | 'high';
  impact: string;
  mitigation: string;
}

export class MultiDocumentAnalysisEngine {
  private documentHandler: any; // Will be injected
  private ocrService: any; // Will be injected

  constructor(documentHandler: any, ocrService: any) {
    this.documentHandler = documentHandler;
    this.ocrService = ocrService;
  }

  /**
   * Main analysis method that processes multiple documents and creates comprehensive financial picture
   */
  async analyzeDocuments(documents: File[]): Promise<ComprehensiveFinancialData> {
    const processedDocuments = await this.processDocuments(documents);
    const comprehensiveData = await this.correlateData(processedDocuments);
    const insights = await this.generateInsights(comprehensiveData);
    
    return {
      ...comprehensiveData,
      insights,
      analysisTimestamp: new Date().toISOString()
    };
  }

  /**
   * Process individual documents and extract structured data
   */
  private async processDocuments(documents: File[]): Promise<{
    creditReports: CreditReportData[];
    payStubs: PayStubData[];
    debtDocuments: DebtDocumentData[];
  }> {
    const creditReports: CreditReportData[] = [];
    const payStubs: PayStubData[] = [];
    const debtDocuments: DebtDocumentData[] = [];

    for (const document of documents) {
      const documentType = await this.detectDocumentType(document);
      const extractedData = await this.extractDocumentData(document, documentType);

      switch (documentType) {
        case 'credit_report':
          creditReports.push(extractedData as CreditReportData);
          break;
        case 'pay_stub':
          payStubs.push(extractedData as PayStubData);
          break;
        case 'debt_document':
          debtDocuments.push(extractedData as DebtDocumentData);
          break;
      }
    }

    return { creditReports, payStubs, debtDocuments };
  }

  /**
   * Detect document type based on content analysis
   */
  private async detectDocumentType(document: File): Promise<'credit_report' | 'pay_stub' | 'debt_document' | 'unknown'> {
    const content = await this.documentHandler.extractText(document);
    const lowerContent = content.toLowerCase();

    // Credit report indicators
    if (lowerContent.includes('credit report') || 
        lowerContent.includes('credit score') ||
        lowerContent.includes('transunion') ||
        lowerContent.includes('equifax') ||
        lowerContent.includes('experian')) {
      return 'credit_report';
    }

    // Pay stub indicators
    if (lowerContent.includes('pay stub') ||
        lowerContent.includes('payroll') ||
        lowerContent.includes('gross pay') ||
        lowerContent.includes('net pay') ||
        lowerContent.includes('withholding')) {
      return 'pay_stub';
    }

    // Debt document indicators
    if (lowerContent.includes('minimum payment') ||
        lowerContent.includes('interest rate') ||
        lowerContent.includes('balance due') ||
        lowerContent.includes('payment due') ||
        lowerContent.includes('account balance')) {
      return 'debt_document';
    }

    return 'unknown';
  }

  /**
   * Extract structured data from documents based on type
   */
  private async extractDocumentData(document: File, documentType: string): Promise<any> {
    const content = await this.documentHandler.extractText(document);

    switch (documentType) {
      case 'credit_report':
        return this.parseCreditReport(content);
      case 'pay_stub':
        return this.parsePayStub(content);
      case 'debt_document':
        return this.parseDebtDocument(content);
      default:
        throw new Error(`Unknown document type: ${documentType}`);
    }
  }

  /**
   * Parse credit report data
   */
  private parseCreditReport(content: string): CreditReportData {
    // Extract credit score
    const creditScoreMatch = content.match(/(?:credit score|fico score)[:\s]*(\d{3})/i);
    const creditScore = creditScoreMatch ? parseInt(creditScoreMatch[1]) : 0;

    // Extract accounts
    const accounts = this.extractCreditAccounts(content);

    // Extract utilization
    const utilization = this.calculateUtilization(accounts);

    // Extract inquiries
    const inquiries = this.extractCreditInquiries(content);

    return {
      creditScore,
      creditBureau: this.detectCreditBureau(content),
      reportDate: this.extractDate(content, 'report date'),
      accounts,
      inquiries,
      publicRecords: this.extractPublicRecords(content),
      personalInfo: this.extractPersonalInfo(content),
      utilization
    };
  }

  /**
   * Parse pay stub data
   */
  private parsePayStub(content: string): PayStubData {
    const grossPay = this.extractAmount(content, 'gross pay');
    const netPay = this.extractAmount(content, 'net pay');
    const deductions = this.extractDeductions(content);

    return {
      employeeName: this.extractName(content),
      employer: this.extractEmployer(content),
      payPeriod: this.extractPayPeriod(content),
      grossPay,
      deductions,
      netPay,
      yearToDate: this.extractYearToDate(content),
      payFrequency: this.detectPayFrequency(content),
      hourlyRate: this.extractAmount(content, 'hourly rate'),
      hoursWorked: this.extractHours(content)
    };
  }

  /**
   * Parse debt document data
   */
  private parseDebtDocument(content: string): DebtDocumentData {
    return {
      documentType: this.detectDebtDocumentType(content),
      creditor: this.extractCreditor(content),
      accountNumber: this.extractAccountNumber(content),
      currentBalance: this.extractAmount(content, 'current balance'),
      minimumPayment: this.extractAmount(content, 'minimum payment'),
      interestRate: this.extractInterestRate(content),
      paymentDueDate: this.extractDate(content, 'payment due'),
      lastPaymentDate: this.extractDate(content, 'last payment'),
      lastPaymentAmount: this.extractAmount(content, 'last payment'),
      term: this.extractTerm(content),
      remainingPayments: this.extractRemainingPayments(content),
      lateFees: this.extractAmount(content, 'late fee'),
      annualFee: this.extractAmount(content, 'annual fee'),
      gracePeriod: this.extractGracePeriod(content)
    };
  }

  /**
   * Correlate data across all documents
   */
  private async correlateData(processedDocuments: {
    creditReports: CreditReportData[];
    payStubs: PayStubData[];
    debtDocuments: DebtDocumentData[];
  }): Promise<ComprehensiveFinancialData> {
    const { creditReports, payStubs, debtDocuments } = processedDocuments;

    // Use the most recent credit report
    const creditReport = creditReports.length > 0 ? creditReports[0] : undefined;

    // Calculate cross-references
    const crossReferences = this.calculateCrossReferences(creditReport, payStubs, debtDocuments);

    return {
      creditReport,
      payStubs,
      debtDocuments,
      analysisTimestamp: new Date().toISOString(),
      crossReferences,
      insights: {} as FinancialInsights // Will be populated by generateInsights
    };
  }

  /**
   * Calculate cross-references between documents
   */
  private calculateCrossReferences(
    creditReport: CreditReportData | undefined,
    payStubs: PayStubData[],
    debtDocuments: DebtDocumentData[]
  ): CrossReferenceAnalysis {
    const monthlyIncome = this.calculateMonthlyIncome(payStubs);
    const totalDebt = this.calculateTotalDebt(debtDocuments);
    const incomeDebtRatio = monthlyIncome > 0 ? totalDebt / monthlyIncome : 0;

    return {
      incomeDebtRatio,
      creditUtilizationImpact: creditReport ? creditReport.utilization.overall : 0,
      paymentCapacity: this.calculatePaymentCapacity(monthlyIncome, debtDocuments),
      refinancingEligibility: this.checkRefinancingEligibility(creditReport, payStubs),
      consolidationOpportunities: this.findConsolidationOpportunities(creditReport, debtDocuments),
      discrepancies: this.findDataDiscrepancies(creditReport, payStubs, debtDocuments)
    };
  }

  /**
   * Generate comprehensive financial insights
   */
  private async generateInsights(data: ComprehensiveFinancialData): Promise<FinancialInsights> {
    return {
      debtToIncomeRatio: data.crossReferences.incomeDebtRatio,
      creditScoreFactors: this.analyzeCreditScoreFactors(data.creditReport),
      cashFlowAnalysis: this.analyzeCashFlow(data.payStubs, data.debtDocuments),
      optimizationOpportunities: this.findOptimizationOpportunities(data),
      riskAssessment: this.assessRisk(data)
    };
  }

  // Helper methods for data extraction and analysis
  private extractCreditAccounts(content: string): CreditAccount[] {
    // Implementation for extracting credit accounts from content
    // This would use regex patterns and AI parsing
    return [];
  }

  private calculateUtilization(accounts: CreditAccount[]): UtilizationData {
    const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);
    const totalLimit = accounts.reduce((sum, account) => sum + account.creditLimit, 0);
    const overall = totalLimit > 0 ? (totalBalance / totalLimit) * 100 : 0;

    const byAccount: { [accountName: string]: number } = {};
    accounts.forEach(account => {
      byAccount[account.accountName] = account.utilization;
    });

    return {
      overall,
      byAccount,
      recommended: 30 // Industry recommendation
    };
  }

  private extractCreditInquiries(content: string): CreditInquiry[] {
    // Implementation for extracting credit inquiries
    return [];
  }

  private extractPublicRecords(content: string): PublicRecord[] {
    // Implementation for extracting public records
    return [];
  }

  private extractPersonalInfo(content: string): PersonalInfo {
    // Implementation for extracting personal information
    return {
      name: '',
      address: '',
      ssn: '',
      dateOfBirth: ''
    };
  }

  private detectCreditBureau(content: string): string {
    const lowerContent = content.toLowerCase();
    if (lowerContent.includes('transunion')) return 'TransUnion';
    if (lowerContent.includes('equifax')) return 'Equifax';
    if (lowerContent.includes('experian')) return 'Experian';
    return 'Unknown';
  }

  private extractDate(content: string, label: string): string {
    // Implementation for extracting dates
    return '';
  }

  private extractAmount(content: string, label: string): number {
    // Implementation for extracting monetary amounts
    return 0;
  }

  private extractDeductions(content: string): Deduction[] {
    // Implementation for extracting deductions
    return [];
  }

  private extractName(content: string): string {
    // Implementation for extracting employee name
    return '';
  }

  private extractEmployer(content: string): string {
    // Implementation for extracting employer name
    return '';
  }

  private extractPayPeriod(content: string): { start: string; end: string } {
    // Implementation for extracting pay period
    return { start: '', end: '' };
  }

  private extractYearToDate(content: string): { grossPay: number; netPay: number; taxesWithheld: number } {
    // Implementation for extracting YTD data
    return { grossPay: 0, netPay: 0, taxesWithheld: 0 };
  }

  private detectPayFrequency(content: string): 'weekly' | 'bi-weekly' | 'semi-monthly' | 'monthly' {
    // Implementation for detecting pay frequency
    return 'bi-weekly';
  }

  private extractHours(content: string): number | undefined {
    // Implementation for extracting hours worked
    return undefined;
  }

  private detectDebtDocumentType(content: string): 'credit_card_statement' | 'loan_statement' | 'mortgage_statement' | 'collection_letter' {
    // Implementation for detecting debt document type
    return 'credit_card_statement';
  }

  private extractCreditor(content: string): string {
    // Implementation for extracting creditor name
    return '';
  }

  private extractAccountNumber(content: string): string {
    // Implementation for extracting account number
    return '';
  }

  private extractInterestRate(content: string): number {
    // Implementation for extracting interest rate
    return 0;
  }

  private extractTerm(content: string): number | undefined {
    // Implementation for extracting loan term
    return undefined;
  }

  private extractRemainingPayments(content: string): number | undefined {
    // Implementation for extracting remaining payments
    return undefined;
  }

  private extractGracePeriod(content: string): number | undefined {
    // Implementation for extracting grace period
    return undefined;
  }

  private calculateMonthlyIncome(payStubs: PayStubData[]): number {
    if (payStubs.length === 0) return 0;
    
    const latestPayStub = payStubs[0]; // Assuming sorted by date
    const frequency = latestPayStub.payFrequency;
    
    switch (frequency) {
      case 'weekly': return latestPayStub.netPay * 4.33;
      case 'bi-weekly': return latestPayStub.netPay * 2.17;
      case 'semi-monthly': return latestPayStub.netPay * 2;
      case 'monthly': return latestPayStub.netPay;
      default: return latestPayStub.netPay * 2.17; // Default to bi-weekly
    }
  }

  private calculateTotalDebt(debtDocuments: DebtDocumentData[]): number {
    return debtDocuments.reduce((sum, doc) => sum + doc.currentBalance, 0);
  }

  private calculatePaymentCapacity(monthlyIncome: number, debtDocuments: DebtDocumentData[]): number {
    const totalMinimumPayments = debtDocuments.reduce((sum, doc) => sum + doc.minimumPayment, 0);
    return monthlyIncome - totalMinimumPayments;
  }

  private checkRefinancingEligibility(creditReport: CreditReportData | undefined, payStubs: PayStubData[]): boolean {
    if (!creditReport || payStubs.length === 0) return false;
    
    const monthlyIncome = this.calculateMonthlyIncome(payStubs);
    const creditScore = creditReport.creditScore;
    
    // Basic eligibility criteria
    return creditScore >= 650 && monthlyIncome >= 3000;
  }

  private findConsolidationOpportunities(creditReport: CreditReportData | undefined, debtDocuments: DebtDocumentData[]): ConsolidationOpportunity[] {
    // Implementation for finding consolidation opportunities
    return [];
  }

  private findDataDiscrepancies(creditReport: CreditReportData | undefined, payStubs: PayStubData[], debtDocuments: DebtDocumentData[]): DataDiscrepancy[] {
    // Implementation for finding data discrepancies
    return [];
  }

  private analyzeCreditScoreFactors(creditReport: CreditReportData | undefined): CreditScoreFactor[] {
    if (!creditReport) return [];
    
    // Implementation for analyzing credit score factors
    return [];
  }

  private analyzeCashFlow(payStubs: PayStubData[], debtDocuments: DebtDocumentData[]): CashFlowAnalysis {
    const monthlyIncome = this.calculateMonthlyIncome(payStubs);
    const totalMinimumPayments = debtDocuments.reduce((sum, doc) => sum + doc.minimumPayment, 0);
    
    return {
      monthlyIncome,
      monthlyExpenses: totalMinimumPayments, // Simplified
      discretionaryIncome: monthlyIncome - totalMinimumPayments,
      debtServiceRatio: monthlyIncome > 0 ? (totalMinimumPayments / monthlyIncome) * 100 : 0,
      emergencyFundStatus: 'insufficient', // Would need more data
      savingsRate: 0 // Would need more data
    };
  }

  private findOptimizationOpportunities(data: ComprehensiveFinancialData): OptimizationOpportunity[] {
    // Implementation for finding optimization opportunities
    return [];
  }

  private assessRisk(data: ComprehensiveFinancialData): RiskAssessment {
    // Implementation for risk assessment
    return {
      overallRisk: 'medium',
      factors: [],
      recommendations: []
    };
  }
}

export default MultiDocumentAnalysisEngine;
