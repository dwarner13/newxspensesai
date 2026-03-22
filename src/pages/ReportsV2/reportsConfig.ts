import { THEME } from "../PrimeChatV2/agentConfig";
export { THEME };

export interface ReportTemplate {
  name: string;
  agent: "Prime" | "Tag" | "Crystal" | "Byte";
  color: string;
  icon: string;
  desc: string;
  format: string;
  popular: boolean;
}

export interface RecentReport {
  name: string;
  agent: string;
  color: string;
  date: string;
  format: string;
  size: string;
}

export interface ScheduledReport {
  name: string;
  agent: string;
  color: string;
  freq: string;
  next: string;
  active: boolean;
}

export const REPORT_TEMPLATES: ReportTemplate[] = [
  { name: "Monthly Financial Summary", agent: "Prime", color: THEME.accent, icon: "\uD83D\uDCCA", desc: "Full income/expense analysis with advisory notes", format: "PDF", popular: true },
  { name: "Tax Deduction Report", agent: "Prime", color: THEME.accent, icon: "\uD83E\uDDFE", desc: "All identified deductions with CRA-ready categories", format: "PDF / XLSX", popular: true },
  { name: "Category Breakdown", agent: "Tag", color: "#22d3ee", icon: "\uD83C\uDFF7\uFE0F", desc: "Spending by category with confidence scores", format: "PDF / CSV", popular: false },
  { name: "Trend Analysis", agent: "Crystal", color: "#a78bfa", icon: "\uD83D\uDCC8", desc: "3-month spending trends with predictions", format: "PDF", popular: false },
  { name: "Statement Import Log", agent: "Byte", color: "#34d399", icon: "\uD83D\uDCC4", desc: "All processed statements with OCR details", format: "CSV", popular: false },
  { name: "Accountant Package", agent: "Prime", color: THEME.accent, icon: "\uD83D\uDCE7", desc: "Everything your accountant needs in one export", format: "PDF + XLSX", popular: true },
];
