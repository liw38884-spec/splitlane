# Anna AI App Builder submission draft

Official event: https://dorahacks.io/hackathon/2349

The public listing schedules submissions from 2026-08-31 at 21:00 through 2026-11-30 at 07:59. Recheck the rendered form and timezone when it opens.

## Project

**Name:** SplitLane

**One-line summary:** SplitLane turns a conversational group-payment plan into a strictly validated, wallet-controlled USDC settlement draft inside Anna.

## Anna integration

- Schema-2 installable Anna App with a static UI bundle.
- Bundled `create_settlement_draft` Executa validates the title, network, 1–20 unique EVM participants, positive USDC amounts, and six-decimal precision.
- The result is a review URL that preserves the exact participant and amount plan.
- Anna never receives a private key, signs a transaction, or calls a draft paid.

## Links

- Live trust-boundary page: https://splitlane.vercel.app/programs/anna
- Live application: https://splitlane.vercel.app
- Repository: https://github.com/liw38884-spec/splitlane
- Listing copy: https://github.com/liw38884-spec/splitlane/blob/main/docs/anna-listing.md

## Evidence status

- Completed: installed private App `0.1.2`, immutable Executa `0.3.1`, and a successful Anna Cloud run with two participants totaling 20 USDC.
- Completed: App `0.1.2` is pinned as the `pending_review` candidate.
- Required: Anna admin approval and, only after separate authorization, public release.
- Required: marketplace screenshots that match the reviewed behavior.
- Required: demo video URL.

## Submission copy

> SplitLane brings exact, non-custodial group-payment planning into Anna. Its bundled Executa validates every participant and USDC amount before handing the plan to a public wallet-controlled application. The App never handles keys or approvals, and it labels the output as a draft until public contract state proves otherwise.

## Program boundary

Anna Founding Builder qualification is separate from the DoraHacks entry. It requires an approved, published App and at least 200 qualified monthly active users in one calendar month from September through November 2026; installation and testing alone do not qualify.
