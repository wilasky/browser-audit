# Lucent — Browser Audit

Audit your browser security, inspect JavaScript behavior on any website, and analyze GDPR compliance — all locally.

**Status:** beta. See `docs/STATUS.md` for current state.

## What it does

🔬 **ScriptSpy** — Real-time inspection of JavaScript on any website. See what scripts do: network calls, fingerprinting, cookies, mouse tracking. Risk scoring per script + deep static analysis with SHA256, obfuscation detection, and pattern matching.

📋 **GDPR / Compliance audit** — Analyze any page against GDPR criteria: cookie banner, privacy policy, security headers, CSRF tokens, mixed content, library detection, and more.

◆ **Health Check** — 40+ security and privacy checks against your Chrome configuration. Profiles by framework: CIS Benchmark, NIST SP 800-53, CCN-STIC-885 (Spanish ENS).

## Privacy

- **100% local** by default
- No telemetry, no tracking, no account
- Optional AI integration uses **your own** API key (Claude, OpenAI, Ollama)
- Optional Pro backend (when available) only sees SHA256 hashes, never URLs

## Documentation

- `docs/ARCHITECTURE.md` — Project architecture and roadmap
- `docs/PRIVACY_POLICY.md` — Privacy policy
- `docs/LAUNCH_GUIDE.md` — Launch plan, naming, marketing
- `docs/STATUS.md` — Current development status

## License

MIT (extension client). See `LICENSE` for details.

The Pro threat intelligence backend and curated YARA rules are proprietary.
