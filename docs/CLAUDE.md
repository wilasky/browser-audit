# Claude Code Project Rules

## Golden rule

Do not implement new features until:
- the extension loads in `chrome://extensions` without errors;
- lint passes;
- tests pass;
- the current feature works manually in Chrome.

## Working method

- Read `docs/ARCHITECTURE.md`, `docs/BASELINE_SPEC.md`, and `STATUS.md` before making changes.
- Work on one task at a time.
- Keep changes small and reviewable.
- Do not refactor unrelated files.
- Update `STATUS.md` after each completed task.
- Explain any risky decision before implementing it.

## Chrome extension permissions

- Do not add Chrome permissions without explaining why.
- Do not use `<all_urls>` in the MVP unless explicitly approved.
- Prefer `activeTab` and `optional_permissions`.
- Request sensitive permissions only when the related feature needs them.
- High-risk permissions such as `management`, `privacy`, `scripting`, `webRequest`, host permissions, or access to all URLs require justification.

## Privacy rules

- Local-first by default.
- Never send full URLs, cookies, form contents, browsing history, page content, or personal data to any backend.
- Pro threat intelligence lookups may only send normalized hashes such as `SHA256(domain)` or `SHA256(script)`.

## Out of scope until stable MVP

Do not add these until Fase 1 and Fase 2 are stable:
- monetization;
- backend;
- YARA;
- PDF/JSON export;
- historical dashboards;
- API keys.

## Commit style

Use small commits with clear messages, for example:

```bash
git commit -m "chore: setup extension project structure"
git commit -m "feat: add basic health check engine"
git commit -m "feat: audit installed extension permissions"
git commit -m "feat: add scriptspy network instrumentation"
git commit -m "test: add audit engine unit tests"
git commit -m "docs: update project status"