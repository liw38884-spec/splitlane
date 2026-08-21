"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Download, FileJson2, ShieldAlert } from "lucide-react";
import { SPLITLANE_ADDRESSES } from "@/lib/contracts";
import {
  createSettlementAuditArtifact,
  formatSettlementAuditArtifact,
} from "@/lib/audit-record";
import { shortenAddress } from "@/lib/format";
import type { TabRecord } from "@/lib/types";

function downloadJson(filename: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "application/json;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function SettlementEvidence({ tab, isLive }: { tab: TabRecord; isLive: boolean }) {
  const [copied, setCopied] = useState(false);
  const artifact = useMemo(() => {
    if (!isLive) return null;
    try {
      return createSettlementAuditArtifact(tab, SPLITLANE_ADDRESSES[tab.chainId]);
    } catch {
      return null;
    }
  }, [isLive, tab]);

  if (!artifact) {
    return (
      <section className="evidence-panel evidence-panel-unavailable" aria-label="Settlement audit evidence">
        <ShieldAlert size={18} aria-hidden="true" />
        <div>
          <strong>Audit export unavailable</strong>
          <span>Connect to the deployed contract and load a live tab before exporting legal evidence.</span>
        </div>
      </section>
    );
  }

  const filename = `splitlane-${tab.chainId}-tab-${tab.id.toString()}-audit.json`;

  return (
    <section className="evidence-panel" aria-label="Settlement audit evidence">
      <div className="evidence-heading">
        <span className="evidence-icon"><FileJson2 size={18} aria-hidden="true" /></span>
        <div><strong>Settlement audit record</strong><span>Deterministic JSON · Keccak-256 integrity hash</span></div>
      </div>
      <code title={artifact.verification.recordHash}>{shortenAddress(artifact.verification.recordHash, 12, 10)}</code>
      <div className="evidence-actions">
        <button
          className="command-button command-button-small"
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(artifact.verification.recordHash).then(() => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1_500);
            });
          }}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}{copied ? "Copied" : "Copy hash"}
        </button>
        <button
          className="command-button command-button-dark command-button-small"
          type="button"
          onClick={() => downloadJson(filename, formatSettlementAuditArtifact(artifact))}
        >
          <Download size={14} />Download JSON
        </button>
      </div>
    </section>
  );
}
