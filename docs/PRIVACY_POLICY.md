# Privacy Policy — Browser Audit

**Last updated:** 2026-04-25  
**Contact:** aitorciyo@gmail.com

---

## Summary (plain language)

Browser Audit processes data **exclusively in your browser**. Nothing about your browsing history, the websites you visit, your passwords, or your personal identity ever leaves your device — unless you are a Pro subscriber, in which case only anonymized SHA256 hashes are sent to our server.

---

## 1. Data processed locally (never leaves your device)

The following data is processed exclusively within your browser and stored in `chrome.storage.local`:

| Data | Purpose | Retention |
|------|---------|-----------|
| Chrome version from User-Agent | Version check | During audit |
| Chrome privacy settings (DoH, Safe Browsing, cookies, etc.) | Security audit | Audit result cached locally |
| List of installed extension IDs and names | Blacklist check | Audit result cached locally |
| Extension permissions | Permission audit | Audit result cached locally |
| JavaScript behavior on visited pages (network calls, storage access, fingerprinting techniques) | ScriptSpy instrumentation | Current tab session only, reset on navigation |
| Browser fingerprint signals (canvas, WebGL, audio, screen) | Fingerprint entropy score | Score cached locally 1h |
| Audit history (score + label + date, last 10) | Settings history chart | Local storage |
| Plan tier (free/pro) | Feature gating | Local storage |

**None of this data is transmitted to any server.**

## 2. Data sent to our server (Pro plan only)

If you activate the Pro plan, the extension sends anonymized lookups to our threat intelligence API:

| Data sent | What it is | What it is NOT |
|-----------|------------|----------------|
| `SHA256(domain)` | Hash of a domain name | The domain itself, URL, or page content |
| `SHA256(script_url)` | Hash of a script URL | The script source code or any content |
| License/API key | Your Pro subscription key | Personal identity information |

**We never receive:** URLs, page content, cookies, form data, passwords, or any personally identifiable information.

SHA256 hashing is a one-way operation. Given a hash, it is computationally infeasible to recover the original domain or URL.

## 3. Data we do NOT collect

- Browsing history
- Page content or screenshots
- Form inputs, passwords, or credentials
- Cookies or session tokens
- IP address associations with hashed queries (rate-limited by IP, not stored)
- Any analytics or telemetry

## 4. Third-party services

| Service | Purpose | Data shared |
|---------|---------|-------------|
| abuse.ch (URLhaus, MalwareBazaar) | Threat feed data (server-side) | None — we download and store locally |
| OpenPhish | Phishing domain feed (server-side) | None |
| DisconnectMe | Tracker list (server-side) | None |
| ExtensionPay | Payment processing (Pro) | Email + payment info (handled entirely by ExtensionPay, not by us) |

## 5. Permissions justification

| Permission | Why it is required |
|------------|-------------------|
| `storage` | Cache audit results and settings locally |
| `activeTab` | Inject ScriptSpy only on the tab the user is currently viewing |
| `scripting` | Execute ScriptSpy instrumentation on demand |
| `webNavigation` | Reset ScriptSpy data when the user navigates to a new page |
| `management` (optional) | Read installed extensions for the blacklist audit |
| `privacy` (optional) | Read Chrome privacy settings for the security audit |

We do not request any permission that is not strictly required by an implemented feature.

## 6. Data retention

All data is stored in `chrome.storage.local` and is deleted automatically when you uninstall the extension. You can also clear it manually via the Settings tab.

## 7. Children's privacy

Browser Audit is not directed at children under 13 and does not knowingly collect information from them.

## 8. Changes to this policy

If we make material changes to how data is handled, we will update this document and increment the extension version. Changes do not affect data already stored locally.

## 9. Contact

Questions or requests regarding this privacy policy:  
**aitorciyo@gmail.com**
