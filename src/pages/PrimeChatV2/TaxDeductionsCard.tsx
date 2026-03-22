import { THEME } from "./agentConfig";

interface DeductionCategory {
  label: string;
  amount: number;
  color: string;
}

interface TaxDeductionsCardProps {
  total: number;
  categories: DeductionCategory[];
}

export function TaxDeductionsCard({ total, categories }: TaxDeductionsCardProps) {
  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${THEME.orange}0a, ${THEME.orange}03)`,
        border: `1px solid ${THEME.orange}18`,
        borderRadius: 14,
        padding: "16px 20px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: 1.6,
            color: THEME.orange,
            fontWeight: 700,
          }}
        >
          Tax Deductions Identified
        </div>
        <span style={{ fontSize: 20, fontWeight: 800, color: THEME.orange }}>
          ${total.toLocaleString()}
        </span>
      </div>
      <div style={{ display: "flex", gap: 16 }}>
        {categories.map((cat) => (
          <div key={cat.label} style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: THEME.textDim, marginBottom: 3 }}>
              {cat.label}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: cat.color }}>
              ${cat.amount.toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
