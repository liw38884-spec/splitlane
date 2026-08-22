# Base.dev and Base Rewards checklist

Use this checklist before you call the project "Base-ready".

## Current implementation support

- [x] The dashboard can switch between Base Sepolia and Ethereum Sepolia.
- [x] The dashboard uses the official Base Sepolia USDC address.
- [x] Builder Code support exists through `NEXT_PUBLIC_BASE_BUILDER_CODE`.
- [x] The UI can run in demo mode when a live Base Sepolia address is not configured.
- [x] Tabs expose chain-aware shareable URLs and direct tab reads.
- [x] Live Base Sepolia contract address is configured in deployment and frontend env vars.
- [x] The deployed contract address is published in the repository or submission materials.

## Base.dev / Base App checklist

- [ ] Confirm the app metadata and screenshots render correctly in the Base.dev / Base App listing flow.
- [ ] Confirm the Base Sepolia transaction flow works from a connected wallet.
- [ ] Confirm the Base explorer links open the expected Base Sepolia transaction pages.
- [ ] Confirm the Base-specific Builder Code badge appears only when `NEXT_PUBLIC_BASE_BUILDER_CODE` is set.
- [ ] Confirm the app copy does not imply Attestcoin support for Base Sepolia.

## Base Rewards checklist

- [x] Confirm the current Base Rewards program rules for this submission window.
- [ ] Confirm the project satisfies any required activity, chain, or submission criteria.
- [x] Confirm there is no standalone automatic rewards claim form: Base Dashboard verification and Builder Code attribution feed partner programs, competitions, and weekly Builder Rewards opportunities.
- [x] Keep proof of the exact Base Sepolia deployment and tx hash ready for review.
- [ ] Record the live demo flow for review.

## Submission placeholders

| Item | Placeholder |
| --- | --- |
| Base Sepolia contract address | [`0x1EE8dCEE85c5bD8bA8D21B599D08Acc3E80C0d6c`](https://sepolia.basescan.org/address/0x1EE8dCEE85c5bD8bA8D21B599D08Acc3E80C0d6c) |
| Base Sepolia deployment tx hash | [`0xa2b4e8edc7c29865535adc6c6e221762efe2416231dc5807b4404596d6d2070e`](https://sepolia.basescan.org/tx/0xa2b4e8edc7c29865535adc6c6e221762efe2416231dc5807b4404596d6d2070e) |
| Builder Code | `bc_qgmgm02h` |
| App screenshot | `[FILL IN]` |
| Demo video | `[FILL IN]` |
| Current funding/rewards route | [Base Get Funded](https://www.base.org/get-funded) |

## Current official interpretation

Checked on 2026-08-22 against [Base Rewards](https://docs.base.org/apps/growth/rewards), [Builder Codes](https://docs.base.org/apps/builder-codes/builder-codes), and [Get Funded](https://docs.base.org/get-started/get-funded).

- Base Dashboard is the current name for Base.dev.
- The app should be verified with its builder address and keep Builder Code attribution enabled.
- The public Get Funded page describes a weekly 2 ETH Builder Rewards pool and accepts prototypes; eligibility still depends on current activity and campaign review.
- Builder Code attribution is supporting evidence, not proof that a reward was earned or that a separate Base hackathon submission was accepted.

## Do not claim

- Do not claim rewards eligibility unless the program rules are checked against the current date.
- Do not claim Base Sepolia is verified through Attestcoin.
- Do not claim a demo video until you have the real artifact.
