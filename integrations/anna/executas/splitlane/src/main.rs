use std::collections::BTreeMap;
use std::env;
use std::io::{self, BufRead, Write};

const MANIFEST_JSON: &str = r#"{
  "name":"tool-liw38884-splitlane-rhc4cr9r",
  "version":"0.3.1",
  "tools":[{
    "name":"create_settlement_draft",
    "description":"Validate a 1-20 participant USDC split and return a SplitLane wallet-handoff URL. This creates a draft only; it does not sign, pay, or claim settlement.",
    "parameters":[
      {"name":"title","type":"string","description":"Settlement title (1-80 UTF-8 bytes).","required":true},
      {"name":"network","type":"string","description":"SplitLane test network.","required":false,"default":"base-sepolia","enum":["base-sepolia","ethereum-sepolia"]},
      {"name":"participants","type":"array","items":{"type":"object"},"description":"One to twenty objects with unique EVM address and positive USDC amount fields.","required":true}
    ]
  }]
}"#;

#[derive(Clone, Debug, PartialEq)]
enum Json {
    Null,
    Bool(bool),
    Number(String),
    String(String),
    Array(Vec<Json>),
    Object(BTreeMap<String, Json>),
}

impl Json {
    fn get(&self, key: &str) -> Option<&Json> {
        match self {
            Self::Object(values) => values.get(key),
            _ => None,
        }
    }

    fn as_str(&self) -> Option<&str> {
        match self {
            Self::String(value) => Some(value),
            _ => None,
        }
    }

    fn as_array(&self) -> Option<&[Json]> {
        match self {
            Self::Array(values) => Some(values),
            _ => None,
        }
    }
}

fn object(values: impl IntoIterator<Item = (&'static str, Json)>) -> Json {
    Json::Object(
        values
            .into_iter()
            .map(|(key, value)| (key.to_owned(), value))
            .collect(),
    )
}

struct Parser<'a> {
    input: &'a [u8],
    position: usize,
}

impl<'a> Parser<'a> {
    fn new(input: &'a str) -> Self {
        Self {
            input: input.as_bytes(),
            position: 0,
        }
    }

    fn parse(mut self) -> Result<Json, String> {
        self.skip_whitespace();
        let value = self.parse_value()?;
        self.skip_whitespace();
        if self.position != self.input.len() {
            return Err("unexpected trailing JSON data".to_owned());
        }
        Ok(value)
    }

    fn parse_value(&mut self) -> Result<Json, String> {
        match self.peek() {
            Some(b'n') => {
                self.expect_bytes(b"null")?;
                Ok(Json::Null)
            }
            Some(b't') => {
                self.expect_bytes(b"true")?;
                Ok(Json::Bool(true))
            }
            Some(b'f') => {
                self.expect_bytes(b"false")?;
                Ok(Json::Bool(false))
            }
            Some(b'"') => self.parse_string().map(Json::String),
            Some(b'[') => self.parse_array(),
            Some(b'{') => self.parse_object(),
            Some(b'-' | b'0'..=b'9') => self.parse_number().map(Json::Number),
            _ => Err("invalid JSON value".to_owned()),
        }
    }

    fn parse_string(&mut self) -> Result<String, String> {
        self.expect_byte(b'"')?;
        let mut value = String::new();
        let mut chunk_start = self.position;
        loop {
            let byte = self
                .peek()
                .ok_or_else(|| "unterminated JSON string".to_owned())?;
            match byte {
                b'"' | b'\\' => {
                    let chunk = std::str::from_utf8(&self.input[chunk_start..self.position])
                        .map_err(|_| "JSON string is not valid UTF-8")?;
                    value.push_str(chunk);
                    self.position += 1;
                    if byte == b'"' {
                        return Ok(value);
                    }
                    let escaped = self
                        .next()
                        .ok_or_else(|| "unterminated JSON escape".to_owned())?;
                    match escaped {
                        b'"' => value.push('"'),
                        b'\\' => value.push('\\'),
                        b'/' => value.push('/'),
                        b'b' => value.push('\u{0008}'),
                        b'f' => value.push('\u{000c}'),
                        b'n' => value.push('\n'),
                        b'r' => value.push('\r'),
                        b't' => value.push('\t'),
                        b'u' => value.push(self.parse_unicode_escape()?),
                        _ => return Err("invalid JSON escape".to_owned()),
                    }
                    chunk_start = self.position;
                }
                0x00..=0x1f => return Err("control character in JSON string".to_owned()),
                _ => self.position += 1,
            }
        }
    }

    fn parse_unicode_escape(&mut self) -> Result<char, String> {
        let first = self.parse_hex_quad()?;
        let codepoint = if (0xd800..=0xdbff).contains(&first) {
            self.expect_bytes(b"\\u")?;
            let second = self.parse_hex_quad()?;
            if !(0xdc00..=0xdfff).contains(&second) {
                return Err("invalid JSON surrogate pair".to_owned());
            }
            0x10000 + (((first as u32 - 0xd800) << 10) | (second as u32 - 0xdc00))
        } else if (0xdc00..=0xdfff).contains(&first) {
            return Err("unexpected low JSON surrogate".to_owned());
        } else {
            first as u32
        };
        char::from_u32(codepoint).ok_or_else(|| "invalid JSON Unicode escape".to_owned())
    }

    fn parse_hex_quad(&mut self) -> Result<u16, String> {
        let mut value = 0u16;
        for _ in 0..4 {
            let digit = self
                .next()
                .and_then(|byte| (byte as char).to_digit(16))
                .ok_or_else(|| "invalid JSON Unicode escape".to_owned())?;
            value = (value << 4) | digit as u16;
        }
        Ok(value)
    }

    fn parse_array(&mut self) -> Result<Json, String> {
        self.expect_byte(b'[')?;
        self.skip_whitespace();
        let mut values = Vec::new();
        if self.consume(b']') {
            return Ok(Json::Array(values));
        }
        loop {
            self.skip_whitespace();
            values.push(self.parse_value()?);
            self.skip_whitespace();
            if self.consume(b']') {
                return Ok(Json::Array(values));
            }
            self.expect_byte(b',')?;
        }
    }

    fn parse_object(&mut self) -> Result<Json, String> {
        self.expect_byte(b'{')?;
        self.skip_whitespace();
        let mut values = BTreeMap::new();
        if self.consume(b'}') {
            return Ok(Json::Object(values));
        }
        loop {
            self.skip_whitespace();
            let key = self.parse_string()?;
            self.skip_whitespace();
            self.expect_byte(b':')?;
            self.skip_whitespace();
            values.insert(key, self.parse_value()?);
            self.skip_whitespace();
            if self.consume(b'}') {
                return Ok(Json::Object(values));
            }
            self.expect_byte(b',')?;
        }
    }

    fn parse_number(&mut self) -> Result<String, String> {
        let start = self.position;
        self.consume(b'-');
        match self.peek() {
            Some(b'0') => self.position += 1,
            Some(b'1'..=b'9') => {
                self.position += 1;
                while matches!(self.peek(), Some(b'0'..=b'9')) {
                    self.position += 1;
                }
            }
            _ => return Err("invalid JSON number".to_owned()),
        }
        if self.consume(b'.') {
            let fraction_start = self.position;
            while matches!(self.peek(), Some(b'0'..=b'9')) {
                self.position += 1;
            }
            if fraction_start == self.position {
                return Err("invalid JSON number fraction".to_owned());
            }
        }
        if matches!(self.peek(), Some(b'e' | b'E')) {
            self.position += 1;
            if matches!(self.peek(), Some(b'+' | b'-')) {
                self.position += 1;
            }
            let exponent_start = self.position;
            while matches!(self.peek(), Some(b'0'..=b'9')) {
                self.position += 1;
            }
            if exponent_start == self.position {
                return Err("invalid JSON number exponent".to_owned());
            }
        }
        String::from_utf8(self.input[start..self.position].to_vec())
            .map_err(|_| "invalid JSON number".to_owned())
    }

    fn skip_whitespace(&mut self) {
        while matches!(self.peek(), Some(b' ' | b'\n' | b'\r' | b'\t')) {
            self.position += 1;
        }
    }

    fn expect_bytes(&mut self, expected: &[u8]) -> Result<(), String> {
        if self
            .input
            .get(self.position..self.position + expected.len())
            == Some(expected)
        {
            self.position += expected.len();
            Ok(())
        } else {
            Err("unexpected JSON token".to_owned())
        }
    }

    fn expect_byte(&mut self, expected: u8) -> Result<(), String> {
        if self.consume(expected) {
            Ok(())
        } else {
            Err("unexpected JSON token".to_owned())
        }
    }

    fn consume(&mut self, expected: u8) -> bool {
        if self.peek() == Some(expected) {
            self.position += 1;
            true
        } else {
            false
        }
    }

    fn peek(&self) -> Option<u8> {
        self.input.get(self.position).copied()
    }

    fn next(&mut self) -> Option<u8> {
        let byte = self.peek()?;
        self.position += 1;
        Some(byte)
    }
}

fn parse_json(input: &str) -> Result<Json, String> {
    Parser::new(input).parse()
}

fn json_text(value: &Json) -> String {
    fn write(value: &Json, output: &mut String) {
        match value {
            Json::Null => output.push_str("null"),
            Json::Bool(value) => output.push_str(if *value { "true" } else { "false" }),
            Json::Number(value) => output.push_str(value),
            Json::String(value) => {
                output.push('"');
                for character in value.chars() {
                    match character {
                        '"' => output.push_str("\\\""),
                        '\\' => output.push_str("\\\\"),
                        '\u{0008}' => output.push_str("\\b"),
                        '\u{000c}' => output.push_str("\\f"),
                        '\n' => output.push_str("\\n"),
                        '\r' => output.push_str("\\r"),
                        '\t' => output.push_str("\\t"),
                        character if character < '\u{0020}' => {
                            output.push_str(&format!("\\u{:04x}", character as u32));
                        }
                        _ => output.push(character),
                    }
                }
                output.push('"');
            }
            Json::Array(values) => {
                output.push('[');
                for (index, value) in values.iter().enumerate() {
                    if index > 0 {
                        output.push(',');
                    }
                    write(value, output);
                }
                output.push(']');
            }
            Json::Object(values) => {
                output.push('{');
                for (index, (key, value)) in values.iter().enumerate() {
                    if index > 0 {
                        output.push(',');
                    }
                    write(&Json::String(key.clone()), output);
                    output.push(':');
                    write(value, output);
                }
                output.push('}');
            }
        }
    }

    let mut output = String::new();
    write(value, &mut output);
    output
}

fn valid_address(address: &str) -> bool {
    address.len() == 42
        && address.starts_with("0x")
        && address.as_bytes()[2..]
            .iter()
            .all(|byte| byte.is_ascii_hexdigit())
}

fn normalized_amount(value: &str) -> Result<(String, u128), String> {
    let value = value.trim();
    let (integer, fraction) = match value.split_once('.') {
        Some((integer, fraction)) if !fraction.is_empty() && fraction.len() <= 6 => {
            (integer, fraction)
        }
        Some(_) => {
            return Err(
                "USDC amounts must be positive decimal strings with up to 6 decimals".to_owned(),
            );
        }
        None => (value, ""),
    };
    if integer.is_empty()
        || !integer.bytes().all(|byte| byte.is_ascii_digit())
        || !fraction.bytes().all(|byte| byte.is_ascii_digit())
    {
        return Err(
            "USDC amounts must be positive decimal strings with up to 6 decimals".to_owned(),
        );
    }

    let whole = integer
        .parse::<u128>()
        .map_err(|_| "USDC amount is too large".to_owned())?;
    let fractional = if fraction.is_empty() {
        0
    } else {
        format!("{fraction:0<6}")
            .parse::<u128>()
            .map_err(|_| "Invalid USDC amount".to_owned())?
    };
    let atomic = whole
        .checked_mul(1_000_000)
        .and_then(|value| value.checked_add(fractional))
        .ok_or_else(|| "USDC amount is too large".to_owned())?;
    if atomic == 0 {
        return Err("USDC amounts must be positive".to_owned());
    }

    let normalized_integer = integer.trim_start_matches('0');
    let normalized_integer = if normalized_integer.is_empty() {
        "0"
    } else {
        normalized_integer
    };
    let normalized_fraction = fraction.trim_end_matches('0');
    let normalized = if normalized_fraction.is_empty() {
        normalized_integer.to_owned()
    } else {
        format!("{normalized_integer}.{normalized_fraction}")
    };
    Ok((normalized, atomic))
}

fn format_atomic(amount: u128) -> String {
    let whole = amount / 1_000_000;
    let fraction = amount % 1_000_000;
    if fraction == 0 {
        return whole.to_string();
    }
    let fraction = format!("{fraction:06}");
    format!("{whole}.{}", fraction.trim_end_matches('0'))
}

fn url_encode(value: &str) -> String {
    let mut encoded = String::new();
    for byte in value.bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                encoded.push(byte as char)
            }
            b' ' => encoded.push('+'),
            _ => encoded.push_str(&format!("%{byte:02X}")),
        }
    }
    encoded
}

fn create_draft(arguments: &Json) -> Result<Json, String> {
    let title = arguments
        .get("title")
        .and_then(Json::as_str)
        .unwrap_or("")
        .trim();
    if title.is_empty() || title.len() > 80 {
        return Err("Title must be 1-80 UTF-8 bytes".to_owned());
    }
    let participants = arguments
        .get("participants")
        .and_then(Json::as_array)
        .ok_or_else(|| "Use 1-20 participants".to_owned())?;
    if participants.is_empty() || participants.len() > 20 {
        return Err("Use 1-20 participants".to_owned());
    }
    let network = arguments
        .get("network")
        .and_then(Json::as_str)
        .unwrap_or("base-sepolia");
    if !matches!(network, "base-sepolia" | "ethereum-sepolia") {
        return Err("Unsupported SplitLane network".to_owned());
    }

    let mut seen = Vec::<String>::new();
    let mut total = 0u128;
    let mut normalized_participants = Vec::with_capacity(participants.len());
    let mut query = vec![
        ("chain", network.to_owned()),
        ("draft", "1".to_owned()),
        ("source", "anna".to_owned()),
        ("title", title.to_owned()),
    ];

    for participant in participants {
        let address = participant
            .get("address")
            .and_then(Json::as_str)
            .unwrap_or("")
            .trim();
        if !valid_address(address) {
            return Err("Every participant needs a valid EVM address".to_owned());
        }
        let address_key = address.to_ascii_lowercase();
        if seen.contains(&address_key) {
            return Err("Participant addresses must be unique".to_owned());
        }
        let amount = participant
            .get("amount")
            .and_then(Json::as_str)
            .unwrap_or("");
        let (amount_text, atomic) = normalized_amount(amount)?;
        total = total
            .checked_add(atomic)
            .ok_or_else(|| "USDC total is too large".to_owned())?;
        seen.push(address_key);
        normalized_participants.push(object([
            ("address", Json::String(address.to_owned())),
            ("amount", Json::String(amount_text.clone())),
        ]));
        query.push(("participant", address.to_owned()));
        query.push(("amount", amount_text));
    }

    let base_url = env::var("SPLITLANE_APP_URL")
        .unwrap_or_else(|_| "https://splitlane.vercel.app".to_owned())
        .trim_end_matches('/')
        .to_owned();
    let query = query
        .iter()
        .map(|(key, value)| format!("{}={}", url_encode(key), url_encode(value)))
        .collect::<Vec<_>>()
        .join("&");

    Ok(object([
        ("title", Json::String(title.to_owned())),
        ("network", Json::String(network.to_owned())),
        ("participants", Json::Array(normalized_participants)),
        (
            "participant_count",
            Json::Number(participants.len().to_string()),
        ),
        ("total_usdc", Json::String(format_atomic(total))),
        ("launch_url", Json::String(format!("{base_url}/?{query}"))),
        ("execution_status", Json::String("draft-only".to_owned())),
    ]))
}

fn invoke(tool: &str, arguments: &Json) -> Json {
    if tool != "create_settlement_draft" {
        return object([
            ("success", Json::Bool(false)),
            ("error", Json::String(format!("unknown method: {tool}"))),
        ]);
    }
    match create_draft(arguments) {
        Ok(data) => object([("success", Json::Bool(true)), ("data", data)]),
        Err(error) => object([
            ("success", Json::Bool(false)),
            ("error", Json::String(error)),
        ]),
    }
}

fn rpc_response(id: Json, result: Json) -> Json {
    object([
        ("jsonrpc", Json::String("2.0".to_owned())),
        ("id", id),
        ("result", result),
    ])
}

fn rpc_error(id: Json, message: impl Into<String>) -> Json {
    object([
        ("jsonrpc", Json::String("2.0".to_owned())),
        ("id", id),
        (
            "error",
            object([
                ("code", Json::Number("-32601".to_owned())),
                ("message", Json::String(message.into())),
            ]),
        ),
    ])
}

fn handle_request(line: &str) -> Json {
    let request = match parse_json(line) {
        Ok(request) => request,
        Err(error) => return rpc_error(Json::Null, error),
    };
    let id = request.get("id").cloned().unwrap_or(Json::Null);
    match request.get("method").and_then(Json::as_str) {
        Some("describe") => match parse_json(MANIFEST_JSON) {
            Ok(manifest) => rpc_response(id, manifest),
            Err(error) => rpc_error(id, error),
        },
        Some("health") => rpc_response(id, object([("status", Json::String("ready".to_owned()))])),
        Some("invoke") => {
            let params = match request.get("params") {
                Some(params) => params,
                None => return rpc_error(id, "missing invoke params"),
            };
            let tool = params.get("tool").and_then(Json::as_str).unwrap_or("");
            let empty_arguments = Json::Object(BTreeMap::new());
            let arguments = params.get("arguments").unwrap_or(&empty_arguments);
            rpc_response(id, invoke(tool, arguments))
        }
        Some(method) => rpc_error(id, format!("unknown rpc: {method}")),
        None => rpc_error(id, "missing rpc method"),
    }
}

fn main() -> io::Result<()> {
    let stdin = io::stdin();
    let mut stdout = io::BufWriter::new(io::stdout().lock());
    for line in stdin.lock().lines() {
        let line = line?;
        if line.trim().is_empty() {
            continue;
        }
        writeln!(stdout, "{}", json_text(&handle_request(line.trim())))?;
        stdout.flush()?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn valid_request(title: &str) -> String {
        format!(
            r#"{{"jsonrpc":"2.0","id":7,"method":"invoke","params":{{"tool":"create_settlement_draft","arguments":{{"title":"{title}","network":"ethereum-sepolia","participants":[{{"address":"0x1111111111111111111111111111111111111111","amount":"12.340000"}},{{"address":"0x2222222222222222222222222222222222222222","amount":"7.66"}}]}}}}}}"#
        )
    }

    #[test]
    fn describe_uses_protocol_native_parameter_records() {
        let manifest = parse_json(MANIFEST_JSON).expect("valid manifest JSON");
        assert_eq!(
            manifest.get("name").and_then(Json::as_str),
            Some("tool-liw38884-splitlane-rhc4cr9r")
        );
        assert_eq!(
            manifest.get("version").and_then(Json::as_str),
            Some("0.3.1")
        );
        let tools = manifest
            .get("tools")
            .and_then(Json::as_array)
            .expect("tools array");
        let parameters = tools[0]
            .get("parameters")
            .and_then(Json::as_array)
            .expect("protocol-native parameter array");
        assert_eq!(parameters.len(), 3);
        assert_eq!(
            parameters[0].get("name").and_then(Json::as_str),
            Some("title")
        );
        assert_eq!(
            parameters[1].get("name").and_then(Json::as_str),
            Some("network")
        );
        assert_eq!(
            parameters[2].get("name").and_then(Json::as_str),
            Some("participants")
        );
    }

    #[test]
    fn validates_and_normalizes_a_draft() {
        let response = handle_request(&valid_request("Anna E2E draft"));
        let result = response.get("result").unwrap();
        assert_eq!(result.get("success"), Some(&Json::Bool(true)));
        let data = result.get("data").unwrap();
        assert_eq!(data.get("total_usdc").and_then(Json::as_str), Some("20"));
        assert_eq!(
            data.get("execution_status").and_then(Json::as_str),
            Some("draft-only")
        );
        assert!(
            data.get("launch_url")
                .and_then(Json::as_str)
                .unwrap()
                .contains("title=Anna+E2E+draft")
        );
    }

    #[test]
    fn rejects_duplicate_participants() {
        let request = valid_request("Duplicates").replace(
            "0x2222222222222222222222222222222222222222",
            "0x1111111111111111111111111111111111111111",
        );
        let response = handle_request(&request);
        let result = response.get("result").unwrap();
        assert_eq!(result.get("success"), Some(&Json::Bool(false)));
        assert_eq!(
            result.get("error").and_then(Json::as_str),
            Some("Participant addresses must be unique")
        );
    }

    #[test]
    fn enforces_utf8_byte_title_limit() {
        let request = valid_request(&"界".repeat(27));
        let response = handle_request(&request);
        let result = response.get("result").unwrap();
        assert_eq!(result.get("success"), Some(&Json::Bool(false)));
        assert_eq!(
            result.get("error").and_then(Json::as_str),
            Some("Title must be 1-80 UTF-8 bytes")
        );
    }

    #[test]
    fn round_trips_unicode_json_escapes() {
        assert_eq!(
            parse_json(r#""\u754c\ud83d\ude80""#),
            Ok(Json::String("界🚀".to_owned()))
        );
    }
}
