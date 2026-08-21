import unittest
from urllib.parse import parse_qs, urlparse

from splitlane_plugin import create_draft, invoke


class SplitLaneDraftTests(unittest.TestCase):
    def test_creates_exact_wallet_handoff(self):
        draft = create_draft({
            "title": "Anna dinner",
            "network": "base-sepolia",
            "participants": [
                {"address": "0x1111111111111111111111111111111111111111", "amount": "12.500000"},
                {"address": "0x2222222222222222222222222222222222222222", "amount": "7"},
            ],
        })
        self.assertEqual(draft["total_usdc"], "19.5")
        self.assertEqual(draft["execution_status"], "draft-only")
        query = parse_qs(urlparse(draft["launch_url"]).query)
        self.assertEqual(query["participant"], [
            "0x1111111111111111111111111111111111111111",
            "0x2222222222222222222222222222222222222222",
        ])
        self.assertEqual(query["amount"], ["12.5", "7"])

    def test_rejects_duplicate_addresses_and_excess_decimals(self):
        base = "0x1111111111111111111111111111111111111111"
        with self.assertRaisesRegex(ValueError, "unique"):
            create_draft({"title": "Bad", "participants": [
                {"address": base, "amount": "1"},
                {"address": base.upper().replace("0X", "0x"), "amount": "2"},
            ]})
        result = invoke("create_settlement_draft", {"title": "Bad", "participants": [{"address": base, "amount": "1.0000001"}]})
        self.assertFalse(result["success"])

    def test_does_not_claim_execution(self):
        result = invoke("create_settlement_draft", {"title": "One", "participants": [{"address": "0x1111111111111111111111111111111111111111", "amount": "1"}]})
        self.assertTrue(result["success"])
        self.assertEqual(result["data"]["execution_status"], "draft-only")


if __name__ == "__main__":
    unittest.main()
