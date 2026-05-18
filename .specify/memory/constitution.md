<!--
SYNC IMPACT REPORT
==================
Version change: N/A → 1.0.0 (initial constitution ratification)

Principles defined:
  - (new) I. Code Quality
  - (new) II. Testing Standards
  - (new) III. User Experience Consistency
  - (new) IV. Performance Requirements

Sections added:
  - Quality Gates
  - Development Workflow

Templates reviewed:
  ✅ .specify/templates/plan-template.md  — Constitution Check section already present; no changes required
  ✅ .specify/templates/spec-template.md  — Acceptance Scenarios and FR requirements align with principles
  ✅ .specify/templates/tasks-template.md — Test task blocks align with Testing Standards principle

Deferred TODOs: none
-->

# GitHub Copilot Foundry Workshop 2027 Constitution

## Core Principles

### I. Code Quality

All code MUST be clean, readable, and purposefully minimal. The project uses Vite with
vanilla HTML, CSS, and JavaScript — framework additions are prohibited unless they
demonstrably reduce complexity with no viable vanilla alternative.

- Files MUST have a single, clear responsibility; logic MUST NOT be duplicated across modules.
- Variables, functions, and files MUST be named to reveal intent without requiring comments.
- Dead code, commented-out blocks, and unused imports MUST be removed before merge.
- Environment configuration MUST flow through `src/_config.js`; hard-coded secrets or
  endpoint strings are strictly prohibited.
- All Foundry/Azure API calls MUST follow the patterns established in
  `src/01_basic_chat.js`, `src/02_file_search.js`, and `src/03_image.js`.

### II. Testing Standards

Every user story MUST have at least one independently executable acceptance test before
implementation begins.

- Unit tests MUST cover all non-trivial pure functions (utility helpers, data transformers).
- Integration tests MUST cover every Foundry API interaction path (chat, file-search, vision).
- Tests MUST be written before the implementation they verify (Red-Green-Refactor cycle).
- A test MUST fail for the right reason before the implementation is written; passing tests
  on untouched code are disqualified as valid coverage.
- Test files MUST mirror the source tree under `tests/` and be independently runnable
  without side-effects on shared state.

### III. User Experience Consistency

All user-facing surfaces MUST follow a single, coherent design language throughout the
application.

- Interactive elements (buttons, inputs, loading states, error messages) MUST use the
  same visual patterns project-wide; ad-hoc one-off styles are prohibited.
- Every API call in-flight MUST present a visible loading indicator; errors returned by
  Foundry MUST be translated into plain-language messages — raw stack traces MUST NOT
  be displayed to the user.
- The chatbot interface MUST be responsive and remain usable on viewport widths from
  360 px to 1920 px.
- Multilingual input (including Thai) MUST be accepted without character corruption or
  layout breakage.
- Accessibility: interactive controls MUST have accessible labels; tab-order MUST follow
  a logical reading sequence.

### IV. Performance Requirements

The application MUST meet the following measurable thresholds at all times:

- **Initial page load** (Vite dev + production build): first meaningful paint ≤ 2 s on a
  standard broadband connection.
- **Chat response latency**: the UI MUST render the first streamed token from Foundry
  within 3 s of user submission under normal network conditions.
- **Bundle size**: total JavaScript delivered to the browser MUST NOT exceed 200 KB
  (gzip) excluding vendor chunks for Azure/OpenAI SDKs.
- **API efficiency**: each user query MUST result in exactly one Foundry API call; fanout
  or redundant calls for the same query are prohibited.
- Performance regressions that violate any threshold above block merge until resolved.

## Quality Gates

Every pull request MUST satisfy all of the following gates before merge:

1. **No bracket placeholders** — no `[ALL_CAPS_TOKEN]` strings may survive in shipped code
   or documentation.
2. **Tests green** — all unit and integration tests pass; no skipped tests without an
   associated issue reference.
3. **Linting clean** — ESLint (or equivalent configured linter) reports zero errors.
4. **No secrets** — `git diff` MUST contain no API keys, connection strings, or `.env`
   values; `.env` is in `.gitignore`.
5. **Constitution compliance** — the PR author MUST self-certify that all four core
   principles are satisfied (checklist in PR description).

## Development Workflow

1. Feature branches are created from `main` following the `###-feature-name` naming
   convention established by `speckit.git.feature`.
2. Implementation order: spec → plan → tasks → code. Skipping phases requires explicit
   justification documented in the feature spec.
3. Foundry API credentials MUST be stored in a local `.env` file copied from
   `.env.template`; credentials are never committed.
4. The workshop demo flow (`npm run example:1`, `example:2`, `example:3`) MUST remain
   executable at all times; breaking these scripts blocks all other work.
5. Commits are squash-merged to `main` with a conventional commit message
   (`feat:`, `fix:`, `docs:`, `test:`, `chore:`).

## Governance

This constitution supersedes all other practices, style guides, and verbal agreements
for this project. Any amendment MUST:

1. Update this file with a version bump following semantic versioning:
   - **MAJOR** — principle removed or fundamentally redefined.
   - **MINOR** — new principle or section added.
   - **PATCH** — clarification, wording refinement, or typo fix.
2. Include an updated Sync Impact Report (HTML comment at the top of this file).
3. Be reviewed and acknowledged by the project lead before merging.

All PRs and code reviews MUST verify compliance with the four core principles. Complexity
beyond what the principles permit MUST be explicitly justified in the PR description.
Runtime development guidance is in `workshop_guideline/` and `README.md`.

**Version**: 1.0.0 | **Ratified**: 2026-05-18 | **Last Amended**: 2026-05-18
