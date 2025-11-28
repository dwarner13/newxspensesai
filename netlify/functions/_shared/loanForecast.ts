/**
 * Loan Forecast Calculator
 * 
 * Simple deterministic amortization calculator for planning purposes.
 * NOT regulatory-grade accuracy, but suitable for "what if" scenarios.
 * 
 * Handles weekly, biweekly, and monthly payment frequencies.
 */

export interface LoanForecastInput {
  principal: number; // e.g. 175787
  annualRatePct: number; // e.g. 5.39
  paymentAmount: number; // per period
  paymentFrequency: 'weekly' | 'biweekly' | 'monthly';
  extraPerPeriod?: number; // default 0
  maxYears?: number; // default 40 safety cap
}

export interface LoanForecastOutput {
  principal: number;
  annualRatePct: number;
  paymentAmount: number;
  paymentFrequency: 'weekly' | 'biweekly' | 'monthly';
  extraPerPeriod: number;
  periodsOriginal: number;
  yearsOriginal: number;
  interestOriginal: number;
  periodsWithExtra: number;
  yearsWithExtra: number;
  interestWithExtra: number;
  interestSaved: number;
  yearsSaved: number;
}

/**
 * Calculate loan payoff scenarios (original vs with extra payments)
 */
export function calculateLoanForecast(input: LoanForecastInput): LoanForecastOutput {
  const {
    principal,
    annualRatePct,
    paymentAmount,
    paymentFrequency,
    extraPerPeriod = 0,
    maxYears = 40,
  } = input;

  // Convert annual rate to per-period rate
  let periodsPerYear: number;
  let rPeriod: number;

  switch (paymentFrequency) {
    case 'weekly':
      periodsPerYear = 52;
      rPeriod = (annualRatePct / 100) / 52;
      break;
    case 'biweekly':
      periodsPerYear = 26;
      rPeriod = (annualRatePct / 100) / 26;
      break;
    case 'monthly':
      periodsPerYear = 12;
      rPeriod = (annualRatePct / 100) / 12;
      break;
    default:
      throw new Error(`Unsupported payment frequency: ${paymentFrequency}`);
  }

  const maxPeriods = maxYears * periodsPerYear;

  // Scenario 1: Original payment (no extra)
  const originalResult = calculatePayoff({
    principal,
    rPeriod,
    paymentAmount,
    extraPerPeriod: 0,
    maxPeriods,
  });

  // Scenario 2: With extra payments
  const withExtraResult = calculatePayoff({
    principal,
    rPeriod,
    paymentAmount,
    extraPerPeriod,
    maxPeriods,
  });

  // Round final outputs to 2 decimals
  return {
    principal: Math.round(principal * 100) / 100,
    annualRatePct: Math.round(annualRatePct * 1000) / 1000,
    paymentAmount: Math.round(paymentAmount * 100) / 100,
    paymentFrequency,
    extraPerPeriod: Math.round(extraPerPeriod * 100) / 100,
    periodsOriginal: originalResult.periods,
    yearsOriginal: Math.round((originalResult.periods / periodsPerYear) * 100) / 100,
    interestOriginal: Math.round(originalResult.totalInterest * 100) / 100,
    periodsWithExtra: withExtraResult.periods,
    yearsWithExtra: Math.round((withExtraResult.periods / periodsPerYear) * 100) / 100,
    interestWithExtra: Math.round(withExtraResult.totalInterest * 100) / 100,
    interestSaved: Math.round((originalResult.totalInterest - withExtraResult.totalInterest) * 100) / 100,
    yearsSaved: Math.round(((originalResult.periods - withExtraResult.periods) / periodsPerYear) * 100) / 100,
  };
}

/**
 * Internal helper: Calculate payoff for a single scenario
 */
function calculatePayoff(params: {
  principal: number;
  rPeriod: number;
  paymentAmount: number;
  extraPerPeriod: number;
  maxPeriods: number;
}): { periods: number; totalInterest: number } {
  const { principal, rPeriod, paymentAmount, extraPerPeriod, maxPeriods } = params;

  let balance = principal;
  let totalInterest = 0;
  let periods = 0;

  // Check if payment is too small (doesn't cover interest)
  const interestForFirstPeriod = balance * rPeriod;
  const totalPayment = paymentAmount + extraPerPeriod;

  if (totalPayment <= interestForFirstPeriod) {
    // Payment too small - will never pay off
    return {
      periods: maxPeriods, // Return max as a signal
      totalInterest: balance * rPeriod * maxPeriods, // Rough estimate
    };
  }

  // Simulate period-by-period payoff
  while (balance > 0.01 && periods < maxPeriods) {
    // Calculate interest for this period
    const interest = balance * rPeriod;
    totalInterest += interest;

    // Calculate principal payment
    const principalPayment = totalPayment - interest;

    // Ensure we don't overpay
    if (principalPayment >= balance) {
      // Final payment
      totalInterest += balance * rPeriod; // Interest on final balance
      balance = 0;
      periods++;
      break;
    }

    // Apply payment
    balance -= principalPayment;
    periods++;
  }

  return {
    periods,
    totalInterest,
  };
}



