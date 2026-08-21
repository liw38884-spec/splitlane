"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { getAddress, isAddress, parseUnits, type Address } from "viem";
import { formatUsdc, shortenAddress } from "@/lib/format";
import type { TabDraft } from "@/lib/tab-draft";
import type { NewTabInput } from "@/lib/types";

type ParticipantField = { id: number; address: string; amount: string };

type CreateTabDialogProps = {
  actor?: Address;
  initialDraft?: TabDraft;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: NewTabInput) => Promise<boolean>;
};

export function CreateTabDialog({ actor, initialDraft, isOpen, onClose, onSubmit }: CreateTabDialogProps) {
  const [title, setTitle] = useState(initialDraft?.title ?? "");
  const [fields, setFields] = useState<ParticipantField[]>(() =>
    initialDraft
      ? initialDraft.participants.map((participant, index) => ({
          id: index + 1,
          address: participant.address,
          amount: participant.amount,
        }))
      : [
          { id: 1, address: "", amount: "" },
          { id: 2, address: "", amount: "" },
        ],
  );
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const total = useMemo(() => fields.reduce((sum, field) => {
    try { return field.amount ? sum + parseUnits(field.amount, 6) : sum; }
    catch { return sum; }
  }, 0n), [fields]);

  if (!isOpen) return null;

  function updateField(id: number, key: "address" | "amount", value: string) {
    setError("");
    setFields((current) => current.map((field) => field.id === id ? { ...field, [key]: value } : field));
  }

  async function submit() {
    setError("");
    const normalizedTitle = title.trim();
    if (!normalizedTitle || new TextEncoder().encode(normalizedTitle).length > 80) {
      setError("Title must be 1-80 bytes");
      return;
    }
    if (fields.length < 1 || fields.length > 20) {
      setError("Use 1-20 participants");
      return;
    }

    const participants: Address[] = [];
    const amounts: bigint[] = [];
    const seen = new Set<string>();
    for (const field of fields) {
      if (!isAddress(field.address)) {
        setError("Check each participant address");
        return;
      }
      const participant = getAddress(field.address);
      if (actor && participant === getAddress(actor)) {
        setError("The recipient cannot be a participant");
        return;
      }
      const key = participant.toLowerCase();
      if (seen.has(key)) {
        setError("Participant addresses must be unique");
        return;
      }
      seen.add(key);
      try {
        const amount = parseUnits(field.amount, 6);
        if (amount <= 0n) throw new Error();
        participants.push(participant);
        amounts.push(amount);
      } catch {
        setError("Amounts must be positive with up to 6 decimals");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const succeeded = await onSubmit({ title: normalizedTitle, participants, amounts });
      if (!succeeded) return;
      setTitle("");
      setFields([{ id: 1, address: "", amount: "" }, { id: 2, address: "", amount: "" }]);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="dialog-panel" role="dialog" aria-modal="true" aria-labelledby="new-tab-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="dialog-header">
          <div><span className="eyebrow">New tab</span><h2 id="new-tab-title">Split a USDC payment</h2></div>
          <button className="icon-button" type="button" title="Close" aria-label="Close" onClick={onClose}><X size={18} aria-hidden="true" /></button>
        </header>

        <div className="dialog-body">
          <label className="field-label" htmlFor="tab-title">Public title</label>
          <input id="tab-title" className="text-input" value={title} maxLength={80} onChange={(event) => { setError(""); setTitle(event.target.value); }} placeholder="Weekend house" autoFocus />
          <div className="recipient-line"><span>Recipient</span><strong>{actor ? shortenAddress(actor) : "Wallet required"}</strong></div>
          <div className="participant-heading"><span>Participants</span><span>{fields.length}/20</span></div>
          <div className="participant-fields">
            {fields.map((field, index) => (
              <div className="participant-field" key={field.id}>
                <span className="participant-index">{String(index + 1).padStart(2, "0")}</span>
                <input className="text-input address-input" aria-label={`Participant ${index + 1} address`} value={field.address} onChange={(event) => updateField(field.id, "address", event.target.value)} placeholder="0x..." spellCheck={false} />
                <div className="amount-input-wrap">
                  <input className="text-input amount-input" aria-label={`Participant ${index + 1} amount`} value={field.amount} inputMode="decimal" onChange={(event) => updateField(field.id, "amount", event.target.value)} placeholder="0.00" />
                  <span>USDC</span>
                </div>
                <button className="icon-button participant-remove" type="button" title="Remove participant" aria-label={`Remove participant ${index + 1}`} disabled={fields.length === 1} onClick={() => setFields((current) => current.filter((item) => item.id !== field.id))}>
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
          <button className="add-participant" type="button" disabled={fields.length >= 20} onClick={() => setFields((current) => [...current, { id: Math.max(...current.map((item) => item.id)) + 1, address: "", amount: "" }])}>
            <Plus size={16} aria-hidden="true" /> Add participant
          </button>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
        </div>

        <footer className="dialog-footer">
          <div><span>Total</span><strong>{formatUsdc(total)} USDC</strong></div>
          <button className="command-button command-button-primary" type="button" disabled={isSubmitting || !actor} onClick={() => void submit()}>
            <Plus size={16} aria-hidden="true" /> {isSubmitting ? "Creating" : "Create tab"}
          </button>
        </footer>
      </section>
    </div>
  );
}
