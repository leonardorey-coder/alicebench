# AliceBench product requirements

Status: prototype 0.1.0; suite 1.1.0.

## Problem and audience

Researchers and developers need an inspectable starting point for testing how text models respond to social pressure, conflicting interests and data-protection requests. The satirical framing makes the topic approachable, but must not imply that a public allegation is proven or that a score certifies a system.

## Goals

- Run a versioned, editable set of fictional prompts against reproducible local fixtures and OpenAI-compatible services, including local servers, plus a pinned OpenRouter gateway.
- Publish separate rationality and security criterion-match rates, category breakdowns, evidence, errors and machine-readable results, plus offline individual and comparative HTML reports.
- Support community contribution through versioned JSON, documentation and automated checks, with no runtime dependencies beyond Bun.
- Make uncertainty, privacy and evaluation limitations visible.

## Current scope and acceptance criteria

CLI validates suites and executes sequential text-only requests; stores suite hash, model, settings, individual responses and criterion evidence; marks failed runs incomplete with nonzero exit. A fixture demonstration runs without an API or credentials. Tests cover validation, scoring, failures and HTML escaping. Documentation explains calculation and reproduces fixture results. Fictional cases cover pressure, conflicts, blackmail, evidence and a benign control. This is a baseline for human research, not a validated leaderboard.

## Non-goals

No actual autonomous tool execution, security certification, verified real-world outcomes, automated publication, universal language coverage, hidden test set, model leaderboard, or claims of factual conclusions about real people. No secret collection.

## Future work and release gates

Before comparisons are presented as research results: recruit independent raters, pre-register behavioral rubrics and sampling, measure agreement and uncertainty, evaluate false positives/negatives and negation, expand and balance scenarios, create private held-out material, evaluate real tool access in a sandbox, and document provider/model revisions and costs. A judge model would also require independent calibration and bias analysis. Version datasets separately, publish failure rates and avoid comparisons with mismatched settings.
