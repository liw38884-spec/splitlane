import { describe, expect, it } from "vitest";
import { draftPath, parseTabDraft, type TabDraft } from "./tab-draft";

const draft: TabDraft = {
  title: "Anna launch dinner",
  participants: [
    { address: "0x1111111111111111111111111111111111111111", amount: "12.5" },
    { address: "0x2222222222222222222222222222222222222222", amount: "7" },
  ],
};

describe("tab drafts", () => {
  it("round-trips a valid Anna draft through the public URL", () => {
    expect(parseTabDraft(draftPath(draft))).toEqual(draft);
  });

  it("rejects incomplete, oversized, and invalid drafts", () => {
    expect(parseTabDraft("?draft=1&title=Missing+shares")).toBeUndefined();
    expect(parseTabDraft("?draft=1&title=Bad&participant=nope&amount=1")).toBeUndefined();
    expect(parseTabDraft(`?draft=1&title=${"a".repeat(81)}&participant=0x1111111111111111111111111111111111111111&amount=1`)).toBeUndefined();
  });

  it("normalizes decimal amounts and caps the participant count", () => {
    const params = new URLSearchParams({ draft: "1", title: "Team tab" });
    for (let index = 0; index < 21; index += 1) {
      params.append("participant", `0x${String(index + 1).padStart(40, "0")}`);
      params.append("amount", "1.000000");
    }
    expect(parseTabDraft(`?${params.toString()}`)).toBeUndefined();

    expect(parseTabDraft("?draft=1&title=Team&participant=0x1111111111111111111111111111111111111111&amount=1.250000")).toEqual({
      title: "Team",
      participants: [{ address: "0x1111111111111111111111111111111111111111", amount: "1.25" }],
    });
  });
});
