import { useState, useCallback } from "react";
import type { PendingConfirmation } from "@/hooks/usePrimeChat";

interface ConfirmationCardProps {
  pending: PendingConfirmation;
  onConfirm: (pending: PendingConfirmation) => Promise<void>;
  onCancel: () => void;
  disabled?: boolean;
}

/**
 * Reusable confirmation action card for any tool requiring user approval.
 * Renders inline in the chat panel — works in both PrimeChatV2 and
 * UnifiedAssistantChat layouts.
 */
export function ConfirmationCard({
  pending,
  onConfirm,
  onCancel,
  disabled = false,
}: ConfirmationCardProps) {
  const [confirming, setConfirming] = useState(false);

  const handleConfirm = useCallback(async () => {
    if (confirming || disabled) return;
    setConfirming(true);
    try {
      await onConfirm(pending);
    } finally {
      setConfirming(false);
    }
  }, [confirming, disabled, onConfirm, pending]);

  const isDisabled = disabled || confirming;

  return (
    <div
      data-testid="confirmation-card"
      style={{
        margin: "8px 0",
        padding: "12px 14px",
        borderRadius: 12,
        border: "1px solid rgba(251, 191, 36, 0.3)",
        background: "rgba(251, 191, 36, 0.06)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <span
          style={{ fontSize: 18, lineHeight: 1, flexShrink: 0, marginTop: 2 }}
          aria-hidden
        >
          ⚠️
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#fbbf24",
              marginBottom: 4,
            }}
          >
            Confirmation Required
          </div>
          <p
            style={{
              fontSize: 14,
              color: "#e2e8f0",
              lineHeight: 1.5,
              margin: 0,
              wordBreak: "break-word",
            }}
          >
            {pending.summary}
          </p>
          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 10,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              data-testid="confirmation-confirm-btn"
              onClick={handleConfirm}
              disabled={isDisabled}
              style={{
                padding: "7px 18px",
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 8,
                border: "none",
                cursor: isDisabled ? "not-allowed" : "pointer",
                background: isDisabled ? "#6b7280" : "#f59e0b",
                color: isDisabled ? "#9ca3af" : "#1e1b0f",
                opacity: isDisabled ? 0.6 : 1,
                transition: "background 0.15s, opacity 0.15s",
              }}
            >
              {confirming ? "Confirming\u2026" : "Confirm"}
            </button>
            <button
              type="button"
              data-testid="confirmation-cancel-btn"
              onClick={onCancel}
              disabled={isDisabled}
              style={{
                padding: "7px 18px",
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 8,
                border: "1px solid rgba(148, 163, 184, 0.3)",
                cursor: isDisabled ? "not-allowed" : "pointer",
                background: isDisabled ? "transparent" : "rgba(148, 163, 184, 0.1)",
                color: isDisabled ? "#6b7280" : "#cbd5e1",
                opacity: isDisabled ? 0.6 : 1,
                transition: "background 0.15s, opacity 0.15s",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
