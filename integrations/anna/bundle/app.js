import { AnnaAppRuntime } from "/static/anna-apps/_sdk/latest/index.js";

const TOOL_ID = globalThis.__ANNA_TOOL_IDS__?.splitlane ?? "tool-dev-splitlane";
const APP_URL = "https://splitlane.vercel.app";
const participants = document.getElementById("participants");
const form = document.getElementById("draft-form");
const status = document.getElementById("status");
let nextParticipantId = 0;

function addParticipant(address = "", amount = "") {
  if (participants.children.length >= 20) return;
  nextParticipantId += 1;
  const row = document.createElement("div");
  row.className = "participant";
  row.dataset.id = String(nextParticipantId);
  row.innerHTML = `<input class="address" aria-label="Participant address" placeholder="0x…" spellcheck="false" value="${address}" /><input class="amount" aria-label="USDC amount" inputmode="decimal" placeholder="0.00" value="${amount}" /><button class="remove" type="button" aria-label="Remove participant">×</button>`;
  row.querySelector(".remove").addEventListener("click", () => {
    if (participants.children.length > 1) row.remove();
    updateSummary();
  });
  row.querySelector(".amount").addEventListener("input", updateSummary);
  participants.append(row);
  updateSummary();
}

function participantValues() {
  return [...participants.querySelectorAll(".participant")].map((row) => ({
    address: row.querySelector(".address").value.trim(),
    amount: row.querySelector(".amount").value.trim(),
  }));
}

function updateSummary() {
  document.getElementById("participant-count").textContent = `${participants.children.length} / 20`;
  const total = participantValues().reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  document.getElementById("total").textContent = `${total.toLocaleString(undefined, { maximumFractionDigits: 6 })} USDC`;
}

function localDraft(args) {
  const title = args.title.trim();
  if (!title || new TextEncoder().encode(title).length > 80) throw new Error("Title must be 1–80 bytes");
  if (!args.participants.length || args.participants.length > 20) throw new Error("Use 1–20 participants");
  const seen = new Set();
  const params = new URLSearchParams({ chain: args.network, draft: "1", source: "anna", title });
  let total = 0;
  for (const participant of args.participants) {
    const address = participant.address.trim();
    if (!/^0x[0-9a-fA-F]{40}$/.test(address) || seen.has(address.toLowerCase())) throw new Error("Participant addresses must be valid and unique");
    if (!/^\d+(?:\.\d{1,6})?$/.test(participant.amount) || Number(participant.amount) <= 0) throw new Error("USDC amounts must be positive with up to 6 decimals");
    seen.add(address.toLowerCase());
    params.append("participant", address);
    params.append("amount", participant.amount);
    total += Number(participant.amount);
  }
  const totalText = total.toFixed(6).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
  return { title, total_usdc: totalText, participant_count: args.participants.length, launch_url: `${APP_URL}/?${params}` };
}

async function connectAnna() {
  try {
    const anna = await AnnaAppRuntime.connect();
    await anna.window.set_title({ title: "SplitLane settlement planner" });
    await anna.window.ready({});
    status.textContent = "Connected to Anna. Draft validation uses the bundled Executa.";
    return anna;
  } catch {
    status.textContent = "Standalone preview. The same validation runs locally; Anna storage is unavailable.";
    return null;
  }
}

document.getElementById("add-participant").addEventListener("click", () => addParticipant());
addParticipant();
addParticipant();
const anna = await connectAnna();

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  status.textContent = "Validating draft…";
  const args = { title: document.getElementById("title").value, participants: participantValues(), network: "base-sepolia" };
  try {
    const output = anna
      ? await anna.tools.invoke({ tool_id: TOOL_ID, method: "create_settlement_draft", args })
      : localDraft(args);
    const draft = output?.data ?? output;
    if (!draft?.launch_url) throw new Error(output?.error ?? "Executa returned no launch URL");
    if (anna) await anna.storage.set({ key: "splitlane:last-draft", value: draft });
    document.getElementById("result-title").textContent = draft.title;
    document.getElementById("result-summary").textContent = `${draft.participant_count} participants · ${draft.total_usdc} USDC`;
    const link = document.getElementById("launch-link");
    link.href = draft.launch_url;
    document.getElementById("result").hidden = false;
    status.textContent = "Draft validated. Wallet execution remains on SplitLane.";
  } catch (error) {
    document.getElementById("result").hidden = true;
    status.textContent = `Error: ${error instanceof Error ? error.message : "Draft validation failed"}`;
  }
});
