<!--
Sync Impact Report
Version change: N/A → 1.0.0 (initial ratification)
Added sections: Core Principles (I–IV), Quality Gates, Development Workflow, Governance
Modified principles: N/A (initial constitution)
Removed sections: N/A (initial constitution)
Templates requiring updates:
  ✅ .specify/templates/plan-template.md — Constitution Check gate references principles I–IV
  ✅ .specify/templates/spec-template.md — Acceptance criteria align with UX Consistency (III) and Testing Standards (II)
  ✅ .specify/templates/tasks-template.md — Task phases include testing and quality gate tasks per Principle II
Deferred TODOs: None
-->

# GitHub Copilot Foundry Workshop 2027 Constitution

## Core Principles

### I. Code Quality (NON-NEGOTIABLE)

Every code contribution MUST meet a consistent quality bar before merging. All JavaScript/Node.js
code MUST pass ESLint with zero errors. Functions MUST be single-purpose, named descriptively, and
kept under 30 lines where feasible. Magic numbers and inline configuration MUST be extracted to
named constants or `.env`-backed environment variables. Dead code, commented-out blocks, and
unresolved `TODO` comments MUST be eliminated before a pull request is opened. Dependencies MUST
be pinned to exact or constrained semver ranges to ensure reproducible builds across workshop
participant environments.

**Rationale**: AI agent code that drifts in quality becomes untestable and unpredictable. A
consistent quality floor prevents technical debt from accumulating in workshop examples that
learners treat as canonical patterns.

### II. Testing Standards (NON-NEGOTIABLE)

All business logic MUST have unit test coverage before implementation is merged (Test-Driven
Development: write failing tests first, then implement). Each agent integration scenario MUST
include at least one integration test exercising the real Azure AI Agents SDK call path. Test
files MUST mirror the source structure under `tests/`. Every acceptance criterion defined in
`spec.md` MUST map 1-to-1 to a runnable, automated test case. No pull request may reduce
overall coverage below 80%.

**Rationale**: Workshop code acts as a reference implementation. Untested examples teach learners
that skipping tests is acceptable — it is not.

### III. User Experience Consistency

All agent interactions MUST return responses in a predictable format: structured output for
machine consumption, human-readable summaries for display. Error messages MUST be actionable,
stating what failed and what the user SHOULD do next. CLI scripts MUST accept `--help`, exit
with code 0 on success, and exit with a non-zero code on failure. Console output MUST NOT
expose raw stack traces or Azure SDK internal details; errors MUST be caught and presented with
user-oriented context. Agent response schemas MUST remain stable within a minor version; breaking
schema changes require a MAJOR version bump of the affected module.

**Rationale**: Learners replicate patterns from workshop code. Inconsistent UX in examples leads
directly to inconsistent UX in production applications built by those learners.

### IV. Performance Requirements

All agent API calls MUST complete within 30 seconds under normal operating conditions, or surface
a timeout error with remediation guidance. File search and vision operations MUST be validated
against representative payloads (≤10 MB files, ≤5 images per request). Scripts MUST reach an
interactive or executable state in under 3 seconds, excluding network I/O. The memory footprint
of any single script MUST remain under 256 MB resident. Any pull request introducing a
performance regression of >20% in a previously measured metric MUST be blocked until addressed.

**Rationale**: Performance expectations established in workshop code become baseline assumptions
in the production systems that learners subsequently build. Concrete thresholds prevent
"works on my machine" anti-patterns from propagating.

## Quality Gates

Pull requests MUST satisfy all of the following before merge:

- ESLint passes with zero errors (`npm run lint`)
- All unit and integration tests pass (`npm test`)
- Test coverage at or above 80%, enforced by the test runner configuration
- No new dependency added without a documented justification in the pull request description
- Constitution Check in `plan.md` completed for the feature
- Performance benchmarks validated for any affected code path

## Development Workflow

1. Create a feature branch per the `speckit.git.feature` naming convention.
2. Write or update the feature specification (`/speckit.specify`) before writing any code.
3. Complete the implementation plan and Constitution Check (`/speckit.plan`) before coding begins.
4. Write failing tests first; implement until tests pass; then refactor (Red-Green-Refactor).
5. Open a pull request; all Quality Gates MUST pass in CI before merge is permitted.
6. Update `Last Amended` in this constitution whenever any principle is added, changed, or removed.

## Governance

This constitution supersedes all other development practices documented in this repository.
Amendments MUST be proposed as a pull request modifying `.specify/memory/constitution.md`,
accompanied by a migration plan for any in-flight work affected by the change. Version bumps
follow semantic versioning: MAJOR when a principle is removed or its non-negotiable rules are
relaxed; MINOR when a new principle or section is added; PATCH for clarifications and wording
refinements. All pull requests and code reviews MUST verify compliance with the principles above.
Complexity MUST be justified against the simplest solution satisfying the accepted criteria.
Refer to `README.md` for runtime development guidance and environment setup.

**Version**: 1.0.0 | **Ratified**: 2026-05-15 | **Last Amended**: 2026-05-15
