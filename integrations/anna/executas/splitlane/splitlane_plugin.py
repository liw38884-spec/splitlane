"""Anna Executa for validating SplitLane settlement drafts."""

from __future__ import annotations

from decimal import Decimal, InvalidOperation
import json
import os
import re
import sys
from urllib.parse import urlencode

ADDRESS_PATTERN = re.compile(r"^0x[0-9a-fA-F]{40}$")
AMOUNT_PATTERN = re.compile(r"^\d+(?:\.\d{1,6})?$")

MANIFEST = {
    "name": "tool-dev-splitlane",
    "version": "0.1.0",
    "tools": [
        {
            "name": "create_settlement_draft",
            "description": "Validate a 1-20 participant USDC split and return a SplitLane wallet-handoff URL. This creates a draft only; it does not sign, pay, or claim settlement.",
            "parameters": {
                "type": "object",
                "required": ["title", "participants"],
                "additionalProperties": False,
                "properties": {
                    "title": {"type": "string", "minLength": 1, "maxLength": 80},
                    "network": {"type": "string", "enum": ["base-sepolia", "ethereum-sepolia"], "default": "base-sepolia"},
                    "participants": {
                        "type": "array",
                        "minItems": 1,
                        "maxItems": 20,
                        "items": {
                            "type": "object",
                            "required": ["address", "amount"],
                            "additionalProperties": False,
                            "properties": {
                                "address": {"type": "string", "pattern": "^0x[0-9a-fA-F]{40}$"},
                                "amount": {"type": "string", "pattern": "^\\d+(?:\\.\\d{1,6})?$"},
                            },
                        },
                    },
                },
            },
        }
    ],
}


def _amount(value: object) -> tuple[str, Decimal]:
    text = str(value).strip()
    if not AMOUNT_PATTERN.fullmatch(text):
        raise ValueError("USDC amounts must be positive decimal strings with up to 6 decimals")
    try:
        amount = Decimal(text)
    except InvalidOperation as error:
        raise ValueError("Invalid USDC amount") from error
    if amount <= 0:
        raise ValueError("USDC amounts must be positive")
    normalized = format(amount, "f")
    if "." in normalized:
        normalized = normalized.rstrip("0").rstrip(".")
    return normalized, amount


def create_draft(arguments: dict) -> dict:
    title = str(arguments.get("title", "")).strip()
    if not title or len(title.encode("utf-8")) > 80:
        raise ValueError("Title must be 1-80 UTF-8 bytes")
    participants = arguments.get("participants")
    if not isinstance(participants, list) or not 1 <= len(participants) <= 20:
        raise ValueError("Use 1-20 participants")
    network = arguments.get("network", "base-sepolia")
    if network not in {"base-sepolia", "ethereum-sepolia"}:
        raise ValueError("Unsupported SplitLane network")

    params: list[tuple[str, str]] = [("chain", network), ("draft", "1"), ("source", "anna"), ("title", title)]
    seen: set[str] = set()
    total = Decimal("0")
    normalized_participants = []
    for participant in participants:
        if not isinstance(participant, dict):
            raise ValueError("Each participant must be an object")
        address = str(participant.get("address", "")).strip()
        key = address.lower()
        if not ADDRESS_PATTERN.fullmatch(address):
            raise ValueError("Every participant needs a valid EVM address")
        if key in seen:
            raise ValueError("Participant addresses must be unique")
        amount_text, amount = _amount(participant.get("amount", ""))
        seen.add(key)
        total += amount
        normalized_participants.append({"address": address, "amount": amount_text})
        params.extend((("participant", address), ("amount", amount_text)))

    base_url = os.environ.get("SPLITLANE_APP_URL", "https://splitlane.vercel.app").rstrip("/")
    total_text = format(total, "f")
    if "." in total_text:
        total_text = total_text.rstrip("0").rstrip(".")
    return {
        "title": title,
        "network": network,
        "participants": normalized_participants,
        "participant_count": len(normalized_participants),
        "total_usdc": total_text,
        "launch_url": f"{base_url}/?{urlencode(params)}",
        "execution_status": "draft-only",
    }


def invoke(method: str, arguments: dict) -> dict:
    if method != "create_settlement_draft":
        return {"success": False, "error": f"unknown method: {method}"}
    try:
        return {"success": True, "data": create_draft(arguments)}
    except (TypeError, ValueError) as error:
        return {"success": False, "error": str(error)}


def main() -> None:
    for raw_line in sys.stdin:
        line = raw_line.strip()
        if not line:
            continue
        request = json.loads(line)
        try:
            method = request.get("method")
            if method == "describe":
                result = MANIFEST
            elif method == "health":
                result = {"status": "ready"}
            elif method == "invoke":
                result = invoke(request["params"]["tool"], request["params"].get("arguments", {}))
            else:
                raise ValueError(f"unknown rpc: {method}")
            response = {"jsonrpc": "2.0", "id": request.get("id"), "result": result}
        except Exception as error:  # noqa: BLE001 - JSON-RPC boundary
            response = {"jsonrpc": "2.0", "id": request.get("id"), "error": {"code": -32601, "message": str(error)}}
        sys.stdout.write(json.dumps(response, separators=(",", ":")) + "\n")
        sys.stdout.flush()


if __name__ == "__main__":
    main()
