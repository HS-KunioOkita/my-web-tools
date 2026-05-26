<!--
SYNC IMPACT REPORT
==================
Version change: (uninitialized template) → 1.0.0
Bump rationale: Initial ratification. All placeholder tokens replaced with
concrete content for the first time; no prior versioned constitution existed.

Modified principles:
  - [PRINCIPLE_1_NAME] → I. Spec-Driven Development
  - [PRINCIPLE_2_NAME] → II. Simplicity First (YAGNI)
  - [PRINCIPLE_3_NAME] → III. Behavior-Focused Testing
  - [PRINCIPLE_4_NAME] → IV. Surgical, Reviewable Changes
  - [PRINCIPLE_5_NAME] → V. Observable & Debuggable

Added sections:
  - Technology & Tooling Constraints (replaces [SECTION_2_NAME])
  - Development Workflow (replaces [SECTION_3_NAME])
  - Governance (filled in)

Removed sections: none

Templates requiring updates:
  - ✅ .specify/templates/plan-template.md — reviewed; "Constitution Check"
    gate is generic and remains compatible with the principles defined here.
  - ✅ .specify/templates/spec-template.md — reviewed; spec scope (user
    stories, requirements, success criteria) aligns with Principles I & III.
  - ✅ .specify/templates/tasks-template.md — reviewed; story-grouped tasks
    align with Principle I; testing tasks remain OPTIONAL per Principle III.
  - ✅ CLAUDE.md — reviewed; current pointer ("read the current plan") is
    consistent with Principle I and requires no edit at this time.

Follow-up TODOs: none. RATIFICATION_DATE is set to today (2026-05-26) as
this is the initial adoption.
-->

# my-web-tools Constitution

## Core Principles

### I. Spec-Driven Development

Every non-trivial change MUST flow through the Spec Kit pipeline:
`/speckit-specify` → `/speckit-plan` → `/speckit-tasks` → `/speckit-implement`.
Specs live under `specs/<###-feature-name>/` and are the source of truth for
*what* and *why*; plans capture *how*. Trivial changes (typo fixes, single-line
config tweaks, doc edits) MAY skip the pipeline but MUST still ship on a
dedicated branch and commit.

**Rationale**: This repo is a collection of small web tools where scope creep
and ad-hoc work are the largest risks. Forcing intent through a spec keeps each
tool focused and reviewable.

### II. Simplicity First (YAGNI)

Implementations MUST be the minimum code that satisfies the spec. No
speculative abstractions, no configuration knobs that nobody asked for, no
error handling for impossible scenarios. If a senior engineer would call the
solution overcomplicated, it MUST be simplified before merge. Three similar
lines is preferred over a premature abstraction.

**Rationale**: Personal tooling rots fast when over-engineered. Simplicity is
how a small workspace stays maintainable by one or two people.

### III. Behavior-Focused Testing

Tests MUST verify user-visible behavior, not internal structure. For each P1
user story in a spec, at least one automated test SHOULD exercise the story
end-to-end (UI flow, HTTP request/response, or CLI invocation). Unit tests are
encouraged for non-trivial pure logic but MUST NOT be added merely to raise
coverage. Tests for impossible inputs or framework internals are forbidden.
TDD is OPTIONAL; tests written after implementation are acceptable provided
they would fail without the implementation.

**Rationale**: Strict TDD is overkill for small web tools; zero testing is
reckless. This principle splits the difference by demanding tests where they
catch real regressions.

### IV. Surgical, Reviewable Changes

Each commit MUST trace directly to its spec or task. Drive-by refactors,
formatting sweeps of unrelated files, and "while I was here" cleanups are
prohibited inside feature commits and MUST be split into their own spec or
chore commit. Every changed line should be defensible against the question
"which task required this?".

**Rationale**: Mixed commits destroy reviewability and `git blame` value, and
they hide regressions. Keeping commits surgical preserves the auditability
that the Spec Kit pipeline depends on.

### V. Observable & Debuggable

Failures MUST be surfaced, never silently swallowed. Errors at system
boundaries (HTTP handlers, CLI entry points, external API calls) MUST be
logged with enough context to reproduce the failure (inputs, operation,
upstream error). User-facing tools MUST distinguish between expected failures
(shown to the user) and unexpected failures (logged with stack trace). Magic
behavior that "just works" without logs is a defect.

**Rationale**: When something breaks at 11pm, the only thing that matters is
whether the logs let you diagnose it without re-running the failing scenario.

## Technology & Tooling Constraints

- **Scope**: The repository hosts small, independent web tools. Each tool
  SHOULD live in its own directory under the repository root and be runnable
  in isolation; cross-tool dependencies require explicit justification in
  the spec.
- **Spec Kit**: `.specify/` and `.claude/` directories are managed by the
  Spec Kit workflow. They MUST NOT be hand-edited outside of a spec that
  explicitly amends them.
- **Per-feature stack choices**: Language, framework, and storage choices are
  made per-tool in the corresponding `plan.md` Technical Context section.
  This constitution does NOT mandate a default stack; whatever is chosen MUST
  be documented in the feature plan.
- **No hidden runtime requirements**: A tool MUST document any required
  environment variables, secrets, or external services in its spec or a
  `quickstart.md`. If it cannot be run from a clean clone after documented
  setup, the tool is incomplete.

## Development Workflow

- **Branching**: Every spec gets a feature branch via `/speckit-git-feature`.
  Work MUST NOT be committed directly to `main` except for the initial commit
  and constitution amendments.
- **Constitution Check gate**: The `Constitution Check` section in every
  `plan.md` MUST be filled in and MUST list any deviations from these
  principles in the plan's Complexity Tracking table, with a justification
  and the simpler alternative rejected.
- **Commits**: One logical change per commit. Commit messages SHOULD reference
  the spec (`specs/###-feature-name`) when applicable.
- **Review**: Self-review is mandatory before declaring work complete:
  re-read the diff and confirm every changed line traces to the spec.
- **Done means verified**: A task is "done" only when its acceptance criteria
  have been demonstrably met (test passing, feature exercised in the
  browser/CLI, or screenshot captured) — never on the basis of "the code
  looks right".

## Governance

- This constitution supersedes ad-hoc conventions. When a tool, plan, or
  task conflicts with these principles, the constitution wins unless the
  plan explicitly justifies the deviation under Complexity Tracking.
- **Amendments** MUST be made via `/speckit-constitution`, which updates this
  file and emits a Sync Impact Report. Every amendment MUST bump
  `CONSTITUTION_VERSION` according to semantic versioning:
  - **MAJOR**: Backward-incompatible change — removing or redefining a
    principle, or governance change that invalidates existing specs.
  - **MINOR**: Adding a new principle or materially expanding existing
    guidance.
  - **PATCH**: Clarifications, typo fixes, or non-semantic refinements.
- **Compliance review**: When opening a pull request that touches more than
  one tool or modifies `.specify/` or `.claude/`, the author MUST re-read
  this constitution and confirm compliance in the PR description.
- **Runtime guidance**: Per-session and per-feature guidance for AI agents
  lives in `CLAUDE.md` (project-level) and the current spec's `plan.md`.
  These files MUST defer to this constitution when in conflict.

**Version**: 1.0.0 | **Ratified**: 2026-05-26 | **Last Amended**: 2026-05-26
