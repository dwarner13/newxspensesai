export type PayoffFrequency = 'weekly' | 'biweekly' | 'semi-monthly' | 'monthly';

export type PayoffInput = {
  principal: number;
  annualRate: number;
  paymentAmount: number;
  paymentFrequency: PayoffFrequency;
  extraPayment?: number;
  lumpSum?: number;
  maxPeriods?: number;
  now?: string | number | Date;
};

export type PayoffPreviewRow = {
  period: number;
  interest: number;
  principal: number;
  balance: number;
};

export type PayoffResult = {
  payoffPeriods: number;
  payoffDateISO: string | null;
  totalInterest: number;
  totalPaid: number;
  endBalance: number;
  warnings: string[];
  amortizationPreview: PayoffPreviewRow[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

function round2(value: number): number {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function toFiniteNumber(value: any, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

function resolveNow(input: PayoffInput): Date {
  const candidate = input?.now;
  if (candidate instanceof Date && !Number.isNaN(candidate.getTime())) return candidate;
  if (typeof candidate === 'string' || typeof candidate === 'number') {
    const parsed = new Date(candidate);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

function averageDaysPerPeriod(freq: PayoffFrequency): number {
  switch (freq) {
    case 'weekly':
      return 7;
    case 'biweekly':
      return 14;
    case 'semi-monthly':
      return 365.2425 / 24;
    case 'monthly':
    default:
      return 365.2425 / 12;
  }
}

export function normalizeFrequency(freq: string): {
  paymentsPerYear: number;
  label: 'weekly' | 'biweekly' | 'semi-monthly' | 'monthly' | 'unknown';
} {
  const text = String(freq || '').trim().toLowerCase();
  if (text === 'weekly' || text === 'week' || text === 'per week' || text === 'every week') {
    return { paymentsPerYear: 52, label: 'weekly' };
  }
  if (
    text === 'biweekly' ||
    text === 'bi-weekly' ||
    text === 'every 2 weeks' ||
    text === 'every two weeks' ||
    text === 'fortnightly'
  ) {
    return { paymentsPerYear: 26, label: 'biweekly' };
  }
  if (
    text === 'semi-monthly' ||
    text === 'semi monthly' ||
    text === 'semimonthly' ||
    text === 'twice monthly' ||
    text === 'twice a month'
  ) {
    return { paymentsPerYear: 24, label: 'semi-monthly' };
  }
  if (text === 'monthly' || text === 'month' || text === 'per month' || text === 'every month') {
    return { paymentsPerYear: 12, label: 'monthly' };
  }
  return { paymentsPerYear: 0, label: 'unknown' };
}

export function computePayoffSchedule(input: PayoffInput): PayoffResult {
  const warnings: string[] = [];
  const principal = Math.max(0, round2(toFiniteNumber(input?.principal, 0)));
  const annualRate = Math.max(0, toFiniteNumber(input?.annualRate, 0));
  const paymentAmount = Math.max(0, round2(toFiniteNumber(input?.paymentAmount, 0)));
  const extraPayment = Math.max(0, round2(toFiniteNumber(input?.extraPayment, 0)));
  const lumpSum = Math.max(0, round2(toFiniteNumber(input?.lumpSum, 0)));
  const maxPeriods = Math.max(1, Math.floor(toFiniteNumber(input?.maxPeriods, 2000)));
  const freqNorm = normalizeFrequency(input?.paymentFrequency || '');
  if (freqNorm.label === 'unknown') {
    warnings.push('unknown payment frequency');
  }
  const paymentsPerYear = Math.max(1, freqNorm.paymentsPerYear || 12);
  const periodicRate = (annualRate / 100) / paymentsPerYear;

  let balance = Math.max(0, round2(principal - lumpSum));
  let payoffPeriods = 0;
  let totalInterest = 0;
  let totalPaid = 0;
  const preview: PayoffPreviewRow[] = [];

  if (principal <= 0) {
    warnings.push('principal is zero');
    return {
      payoffPeriods: 0,
      payoffDateISO: new Date().toISOString(),
      totalInterest: 0,
      totalPaid: 0,
      endBalance: 0,
      warnings,
      amortizationPreview: [],
    };
  }
  if (paymentAmount <= 0 && balance > 0) {
    warnings.push('payment too low (negative amortization)');
    return {
      payoffPeriods: 0,
      payoffDateISO: null,
      totalInterest: 0,
      totalPaid: 0,
      endBalance: balance,
      warnings,
      amortizationPreview: [],
    };
  }

  while (balance > 0.005 && payoffPeriods < maxPeriods) {
    const interest = round2(balance * periodicRate);
    const scheduledPayment = round2(paymentAmount + extraPayment);
    const principalPaidRaw = round2(scheduledPayment - interest);
    if (principalPaidRaw <= 0) {
      warnings.push('payment too low (negative amortization)');
      break;
    }

    const principalPaid = Math.min(balance, principalPaidRaw);
    const actualPayment = round2(principalPaid + interest);
    balance = round2(balance - principalPaid);
    payoffPeriods += 1;
    totalInterest = round2(totalInterest + interest);
    totalPaid = round2(totalPaid + actualPayment);

    if (preview.length < 6) {
      preview.push({
        period: payoffPeriods,
        interest,
        principal: principalPaid,
        balance: Math.max(0, balance),
      });
    }
  }

  if (balance > 0.005 && payoffPeriods >= maxPeriods) {
    warnings.push('max periods reached before payoff');
  }

  const daysOffset = Math.round(payoffPeriods * averageDaysPerPeriod(freqNorm.label === 'unknown' ? 'monthly' : freqNorm.label));
  const payoffDateISO =
    balance <= 0.005
      ? addDays(resolveNow(input), daysOffset).toISOString()
      : null;

  return {
    payoffPeriods,
    payoffDateISO,
    totalInterest: round2(totalInterest),
    totalPaid: round2(totalPaid),
    endBalance: round2(Math.max(0, balance)),
    warnings: Array.from(new Set(warnings)),
    amortizationPreview: preview,
  };
}

export function compareScenarios(baseInput: PayoffInput, scenarioInput: PayoffInput): {
  baseline: PayoffResult;
  scenario: PayoffResult;
  delta: {
    interestSaved: number;
    periodsSaved: number;
    timeSavedDays: number;
    totalSaved: number;
  };
} {
  const baseline = computePayoffSchedule(baseInput);
  const scenario = computePayoffSchedule(scenarioInput);

  const periodsPerYear = normalizeFrequency(baseInput.paymentFrequency).paymentsPerYear || 12;
  const daysPerPeriod = 365.2425 / periodsPerYear;
  const periodsSaved = Math.max(0, baseline.payoffPeriods - scenario.payoffPeriods);
  const interestSaved = round2(Math.max(0, baseline.totalInterest - scenario.totalInterest));
  const totalSaved = round2(Math.max(0, baseline.totalPaid - scenario.totalPaid));

  return {
    baseline,
    scenario,
    delta: {
      interestSaved,
      periodsSaved,
      timeSavedDays: Math.max(0, Math.round(periodsSaved * daysPerPeriod)),
      totalSaved,
    },
  };
}
