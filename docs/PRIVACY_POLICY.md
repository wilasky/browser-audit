# Privacy Policy — Browser Audit

**Last updated:** 2026-04-28  
**Contact:** aitorciyo@gmail.com

---

## Summary (plain language)

Browser Audit processes data **exclusively in your browser**. Nothing about your browsing history, the websites you visit, your passwords, or your personal identity ever leaves your device.

Two optional features can send data outside your browser, **only if you explicitly enable them**:

1. **AI assistant**: if you provide your own API key, audit summaries are sent directly to the AI provider you chose (Anthropic, OpenAI, or your local Ollama). Browser Audit servers never see this traffic.
2. **Pro threat intelligence** (future plan): when launched, only anonymized SHA256 hashes will be sent to our server.

---

## 1. Data processed locally (never leaves your device)

The following data is processed exclusively within your browser and stored in `chrome.storage.local`:

| Data | Purpose | Retention |
|------|---------|-----------|
| Chrome version from User-Agent | Version check | During audit |
| Chrome privacy settings (DoH, Safe Browsing, cookies, etc.) | Security audit | Audit result cached locally |
| List of installed extension IDs and names | Blacklist check | Audit result cached locally |
| Extension permissions | Permission audit | Audit result cached locally |
| Scripts, headers and cookies of the currently active tab | ScriptSpy and compliance audit | Current tab session only, reset on navigation |
| Browser fingerprint signals (canvas, WebGL, audio, screen) | Fingerprint entropy score | Score cached locally 1h |
| Audit history (score + label + date, last 10) | Settings history chart | Local storage |
| User-provided AI API key (if you enable the optional AI feature) | Authenticate calls to the provider you chose | Local storage; cleared when you remove it in Settings |
| Plan tier (free/pro) | Feature gating | Local storage |

**None of this data is transmitted to any Browser Audit server.**

## 2. Optional AI assistant (off by default)

Browser Audit offers an optional feature that lets you ask an AI assistant to summarize an audit or a privacy policy. This feature is **disabled by default**. If you enable it, you choose an AI provider and provide **your own API key**.

| Item | What happens |
|------|--------------|
| Your API key | Stored only in `chrome.storage.local` on your device. Never transmitted to Browser Audit servers. Used solely to authenticate calls to the provider you chose. |
| The text sent to the provider | Goes **directly** from your browser to the endpoint you configured (`api.anthropic.com`, `api.openai.com`, or your local Ollama). Browser Audit does not proxy, log, or see this traffic. |

You can revoke the feature at any time by removing the key in Settings; the key is wiped from local storage immediately. Browser Audit is not responsible for the privacy practices of the AI provider you choose — please read their privacy policy directly.

## 3. Data sent to our server (future Pro plan only)

The Pro plan is **not active in this version**. When launched, it will send only anonymized lookups to a threat intelligence API:

| Data sent | What it is | What it is NOT |
|-----------|------------|----------------|
| `SHA256(domain)` | Hash of a domain name | The domain itself, URL, or page content |
| `SHA256(script_url)` | Hash of a script URL | The script source code or any content |
| License/Pro subscription key | Your Pro subscription identifier | Personal identity information |

**We will never receive:** URLs, page content, cookies, form data, passwords, or any personally identifiable information.

SHA256 hashing is a one-way operation. Given a hash, it is computationally infeasible to recover the original domain or URL.

## 4. Data we do NOT collect

- Browsing history
- Page content text, screenshots, or media
- Form inputs or passwords (your AI API key, if you provide one, is stored only locally — see section 2)
- Session cookies or authentication tokens of websites you visit
- IP address associations with hashed queries
- Any analytics or telemetry about your use of the extension

## 5. Third-party services

| Service | Purpose | Data shared |
|---------|---------|-------------|
| AI provider chosen by the user (Anthropic, OpenAI, or local Ollama) | Optional AI assistant — only when the user enables it and provides their own API key | The text the user submits for summarization. Subject to the provider's own privacy policy. |
| abuse.ch (URLhaus, MalwareBazaar) | Threat intelligence feeds (used server-side in the future Pro plan) | None — feeds are downloaded and stored on our server |
| OpenPhish | Phishing domain feed (future Pro plan, server-side) | None |
| DisconnectMe | Tracker list (future Pro plan, server-side) | None |
| ExtensionPay | Payment processing (future Pro plan) | Email + payment info, handled entirely by ExtensionPay, not by us |

## 6. Permissions justification

| Permission | Why it is required |
|------------|-------------------|
| `storage` | Cache audit results, settings and locally analyzed data |
| `activeTab` | Run analysis only on the tab the user is currently viewing, after explicit action |
| `scripting` | Inject the analysis content scripts (bundled inside the extension package — no remote code) on demand |
| `webNavigation` | Reset ScriptSpy data when the user navigates to a new page |
| `alarms` | Periodically re-apply the user's privacy hardening (every 30 min) and re-run the local health audit (every 24 h). No network calls are triggered by these alarms. |
| `management` (optional) | Read the list of installed extensions for the blacklist audit. Requested only when the user enables that section. |
| `privacy` (optional) | Read and modify Chrome privacy settings for the security audit. Requested only when the user clicks "Apply" on a related check. |
| `contentSettings` (optional) | Read and modify content settings (cookies, JavaScript, etc.) for the audit. Requested only when the user clicks "Apply" on a related check. |
| `<all_urls>` (optional host) | Inject the analysis content script on any site the user explicitly chooses to audit. The extension does not crawl or fetch URLs in the background. |

We do not request any permission that is not strictly required by an implemented feature.

## 7. Data retention

All data is stored in `chrome.storage.local` and is deleted automatically when you uninstall the extension. You can also clear it manually via the Settings tab.

## 8. Children's privacy

Browser Audit is not directed at children under 13 and does not knowingly collect information from them.

## 9. Changes to this policy

If we make material changes to how data is handled, we will update this document and increment the extension version. Changes do not affect data already stored locally.

## 10. Contact

Questions or requests regarding this privacy policy:  
**aitorciyo@gmail.com**
