import type { ParsedQuickAdd } from "@shared/types";
import { formatWhen, priorityLabel } from "../lib/formatters";

interface ConfirmChipProps {
  parsed: ParsedQuickAdd;
  onConfirm: () => void;
  onCancel: () => void;
  busy: boolean;
}

export function ConfirmChip({ parsed, onConfirm, onCancel, busy }: ConfirmChipProps) {
  const summary = [
    parsed.title,
    parsed.startsAt !== null ? formatWhen(parsed.startsAt, parsed.isAllDay) : null,
    priorityLabel(parsed.priority),
    parsed.recurrenceText,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="confirm-chip" role="status">
      <span className="confirm-chip__summary">{summary}</span>
      <div className="confirm-chip__actions">
        <button type="button" className="button button--ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button type="button" className="button" onClick={onConfirm} disabled={busy}>
          {busy ? "Saving..." : "Confirm"}
        </button>
      </div>
    </div>
  );
}
