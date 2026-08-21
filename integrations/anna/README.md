# SplitLane for Anna

This directory is an Anna `schema: 2` App bundle with one local Executa. It validates an exact USDC split, returns a public SplitLane draft URL, and leaves every approval and transaction signature in the user's wallet on SplitLane.

## Local verification

```bash
npx -y @anna-ai/cli@0.1.49 validate --strict --manifest manifest.json --bundle ./bundle
python -m unittest discover -s executas/splitlane -p "test_*.py"
npx -y @anna-ai/cli@0.1.49 dev --manifest manifest.json --bundle ./bundle
```

The manifest references `bundled:splitlane`, which maps to `executas/splitlane` in `app.json`. The CLI substitutes the server-minted tool ID during push while retaining `tool-dev-splitlane` as the local-development fallback.

The working draft can be pushed after authentication. Cutting an immutable version and submitting it for external review remain intentional, separately authorized release steps.
