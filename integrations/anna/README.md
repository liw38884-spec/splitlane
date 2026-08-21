# SplitLane for Anna

This directory is an Anna `schema: 2` App bundle with one local Executa. It validates an exact USDC split, returns a public SplitLane draft URL, and leaves every approval and transaction signature in the user's wallet on SplitLane.

## Local verification

```bash
npx -y @anna-ai/cli@0.1.49 validate --strict --manifest manifest.json --bundle ./bundle
python -m unittest discover -s executas/splitlane -p "test_*.py"
npx -y @anna-ai/cli@0.1.49 dev --manifest manifest.json --bundle ./bundle
```

The `tool-dev-splitlane` identifier is the official CLI's synthetic local-development ID. The Anna publishing workflow freezes the bundled Executa version when a verified developer pushes and cuts an immutable App version.

Publishing is intentionally not automated here because it requires an authenticated Anna verified-developer account and triggers external review.
