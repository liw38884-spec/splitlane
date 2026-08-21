"use client";

import { useState } from "react";
import { Check, Copy, Download, PlayCircle, ShieldCheck } from "lucide-react";
import { sepolia } from "viem/chains";
import {
  createAttestcoinProofJob,
  formatAttestcoinCommand,
  type AttestcoinProofJob,
} from "@/lib/attestcoin-request";
import { SPLITLANE_ADDRESSES } from "@/lib/contracts";

function downloadJob(job: AttestcoinProofJob) {
  const content = `${JSON.stringify(job, null, 2)}\n`;
  const url = URL.createObjectURL(new Blob([content], { type: "application/json;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `attestcoin-proof-${job.transactionHash.slice(2, 12)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function AttestcoinProofCenter() {
  const [transactionHash, setTransactionHash] = useState("");
  const [job, setJob] = useState<AttestcoinProofJob | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  function prepareJob() {
    try {
      setJob(createAttestcoinProofJob(transactionHash.trim(), SPLITLANE_ADDRESSES[sepolia.id]));
      setError("");
    } catch (caught) {
      setJob(null);
      setError(caught instanceof Error ? caught.message : "Could not prepare the proof job");
    }
  }

  const command = job ? formatAttestcoinCommand(job) : "";

  return (
    <section className="proof-center" aria-labelledby="proof-center-title">
      <div className="program-card-heading">
        <span className="program-card-icon"><ShieldCheck size={21} aria-hidden="true" /></span>
        <div>
          <span className="eyebrow">Creditcoin CC3 Testnet</span>
          <h2 id="proof-center-title">Prepare an Attestcoin proof job</h2>
        </div>
      </div>
      <p>
        Paste a confirmed <strong>Ethereum Sepolia</strong> SplitLane settlement transaction. The job runs the
        repository&apos;s fail-closed SDK workflow: inspect the receipt, discover the live chain key, build the
        inclusion proof, rebuild the transaction bytes, then call BlockProver <code>verifySingle</code>.
      </p>

      <label className="program-field" htmlFor="attestcoin-transaction-hash">
        <span>Ethereum Sepolia transaction hash</span>
        <input
          id="attestcoin-transaction-hash"
          className="text-input"
          autoComplete="off"
          spellCheck={false}
          value={transactionHash}
          placeholder="0x…"
          onChange={(event) => {
            setTransactionHash(event.target.value);
            setJob(null);
            setError("");
          }}
        />
      </label>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <button className="command-button command-button-primary" type="button" onClick={prepareJob}>
        <PlayCircle size={16} />Prepare proof job
      </button>

      {job ? (
        <div className="proof-job-result" aria-live="polite">
          <div className="proof-job-state">
            <span className="status-pill status-open">Not executed</span>
            <span>This browser prepared inputs only. It has not claimed or submitted a proof.</span>
          </div>
          <div className="proof-command">
            <span>Run from the repository root after setting the two required environment variables:</span>
            <code>{command}</code>
          </div>
          <div className="proof-result-actions">
            <button
              className="command-button command-button-small"
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(command).then(() => {
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1_500);
                });
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}{copied ? "Copied" : "Copy command"}
            </button>
            <button className="command-button command-button-dark command-button-small" type="button" onClick={() => downloadJob(job)}>
              <Download size={14} />Download proof job
            </button>
          </div>
          <details>
            <summary>Inspect strict job JSON</summary>
            <pre>{JSON.stringify(job, null, 2)}</pre>
          </details>
        </div>
      ) : null}
    </section>
  );
}
