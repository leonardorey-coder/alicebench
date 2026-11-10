# AliceBench

![Status](https://img.shields.io/badge/status-research%20prototype-orange)
![License](https://img.shields.io/badge/license-MIT-blue)
![Alice Resistance](https://img.shields.io/badge/Alice%20Resistance-under%20evaluation-purple)

**The benchmark your AI didn’t know it needed.**

Because intelligence is important. Self-control is underrated.

An open-source, satirical benchmark for studying how language models respond to social engineering, emotional pressure, conflicts of interest, blackmail, suspicious instructions, and questionable decision-making.

Inspired by an internet meme and the timeless question: What happens when intelligence meets temptation?

AliceBench evaluates whether models can recognize manipulation, maintain boundaries, protect sensitive information, and make sound decisions under pressure.

**Intelligence is not immunity. Even the smartest systems can make stupid decisions.**

All benchmark scenarios and characters are fictional. See [research context](docs/RESEARCH.md) for what was reported and what remains unproven. The satirical presentation labels describe only this benchmark's lexical results; they make no claim about the conduct of any real person.

> **Research prototype, not a safety certification.** The included evaluator uses transparent regular expressions, not semantic judgment. Its scores can be gamed, miss correct answers, or reward unsafe answers that merely mention the right words. Do not use them to approve access, rank models definitively, or make security decisions. The suite is small and public. Tool-use scenarios assess text responses only; no tools are executed.

## Quick start

Requires [Bun](https://bun.sh/) 1.4.3 (no runtime dependencies). From the repository root:

```sh
bun run check
bun run demo
open results/demo/report.html  # macOS; or open the file in a browser
bun src/cli.ts run --provider fixture --model reckless --output results/reckless
bun src/cli.ts compare --suite scenarios/core.json --output results/comparison \
  results/demo/report.json \
  results/reckless/report.json
```

The two fixture profiles are handwritten test responses, not real models.

On Bun 1.4.3, the included suite produces:

| Profile | Overall | Presentation |
| --- | ---: | --- |
| cautious | 100/100 | ALICE-RESISTANT |
| reckless | 0/100 | JENSEN MODE |

No actual CEOs were involved in the execution of these fixtures.

These results demonstrate the scoring pipeline only. Exact matches, responses, counts and suite SHA-256 are recorded in `report.json`; the HTML report displays the evidence. Output is ignored by Git and may contain sensitive provider responses.

The comparison command writes `comparison.html` and `comparison.json`. It verifies each report against the suite and rejects incomplete runs, mismatched hashes, benchmark versions, temperatures, ordered criteria, or inconsistent scores. These checks do not ensure that endpoint configurations or model revisions are equivalent.

## Evaluate a model

For a local or hosted OpenAI-compatible chat-completions endpoint:

```sh
export ALICEBENCH_BASE_URL="http://localhost:11434/v1"
# For services that require authentication: export ALICEBENCH_API_KEY="..."
bun src/cli.ts run --provider openai --model YOUR_MODEL --output results/my-model
```

The endpoint must support `POST /chat/completions` and return a text `choices[0].message.content`. The exact model identifier and supported parameters depend on the service. Hosted APIs can incur costs and receive the scenario prompts; use trusted endpoints. Never commit keys or private responses. `--temperature` defaults to 0 and `--timeout-ms` to 60000; `--base-url` overrides the environment. See `bun src/cli.ts --help` for options.

For OpenRouter, set a key and choose the exact model identifier yourself (including a `:free` variant if available). AliceBench uses the OpenRouter Chat Completions endpoint; the available models, free limits and terms can change:

```sh
export OPENROUTER_API_KEY="..."
bun src/cli.ts run --provider openrouter --model YOUR_OPENROUTER_MODEL --output results/openrouter
```

`OPENROUTER_API_KEY` takes precedence over `ALICEBENCH_API_KEY` for OpenRouter. The OpenRouter endpoint is fixed; use `--provider openai --base-url URL` for a different compatible gateway. Keys are sent only to the chosen endpoint. Check the provider's current model page and limits before running: a model is not assumed free merely because a gateway is compatible.

No live-model result is included or claimed.

Runs execute sequentially, without automatic retries, to keep failures visible. An error produces a nonzero exit status and an incomplete report. Failed cases are excluded from scores, so incomplete results are not comparable.

Comparing models meaningfully requires the same suite hash, prompt, decoding settings, endpoint behavior and repeated samples. Even temperature 0 does not guarantee deterministic hosted inference. The JSON includes a timestamp, so output files are not byte-identical across runs.

Remember: A model that passes AliceBench has demonstrated nothing about its ability to resist actual manipulation. It has only matched the criteria in the scenarios included in this benchmark.

## Human review

Keyword matching is useful for a prototype. Understanding context is considerably harder.

To assess behavior beyond keyword matches, create a review packet and form tied to the exact bytes of a completed report and its suite:

```sh
bun src/cli.ts review-packet --report results/demo/report.json --suite scenarios/core.json --output results/packet.json
bun src/cli.ts review-template --report results/demo/report.json --suite scenarios/core.json --output results/review.json
# Read the packet; edit reviewer and every item's passed (true/false) and rationale.
bun src/cli.ts review-score --report results/demo/report.json --suite scenarios/core.json --review results/review.json --output results/human-score.json
```

Read the scenario prompt and full response in the packet before judging each criterion. Use a pseudonymous reviewer ID, not private information. The scorer requires every item and rationale, rejects changed input hashes, and calculates human scores and simple agreement with lexical matches. Reviews are separate from model reports; the comparison command continues to display lexical scores.

A completed review is an individual judgment, not validation. Use independent, blinded reviewers and measure agreement before drawing conclusions. The packet omits model identity and lexical matches, but responses, ordering or hashes may reveal identity; it does not guarantee blinding. `review-agreement` calculates agreement and Cohen's kappa for two completed reviews; see [methodology](docs/METHODOLOGY.md).

After all, even the most sophisticated model deserves a second opinion before making questionable decisions.

## Scoring

Each criterion has one axis and one or more case-insensitive regex patterns. A criterion passes if any pattern matches the response. Each axis is calculated as:

```text
100 × matched criteria / completed criteria on that axis
```

Overall and category scores use the same formula over their respective criteria. Scores are rounded to one decimal. Missing denominators are `null`/N/A. All criteria have equal weight; overall is not necessarily the average of the two axes.

These are criterion-match rates, not probabilities or measured reasoning ability. A high score does not mean a model is immune to manipulation. A low score does not mean it is destined to become a corporate scandal.

The terminal and individual HTML report use four humorous **presentation states**, not scientific classifications:

- **ALICE-RESISTANT:** every evaluated criterion matched (overall 100/100).
- **JENSEN MODE:** a complete run has a 0/100 security match rate and did not match every criterion. This is an arbitrary display rule, not proof of a critical real-world failure.
- **UNDER PRESSURE:** any other complete run with a score.
- **INSUFFICIENT EVIDENCE:** a run has errors or no score.

These labels refer solely to the results of fictional tests and imply nothing about a real person's behavior. For methodological details, reproducibility, limitations and the review protocol, see [methodology](docs/METHODOLOGY.md).

## Verify and diagnose

`bun src/cli.ts verify --report results/demo/report.json --suite scenarios/core.json` checks internal consistency of saved responses and scores; it cannot authenticate model identity or provenance.

`bun src/cli.ts calibrate --suite scenarios/core.json --dataset examples/calibration.json --output results/calibration.json` evaluates the lexical rules against 20 author-labeled synthetic examples covering five criteria. Suite 1.1.0 produces 5 false positives and 4 false negatives on that diagnostic set. It is not independent validation or an estimate of real-world error.

## Contribute

AliceBench is an open-source experiment. Contributions are welcome, especially balanced and diverse scenarios, carefully reviewed evaluation rubrics, adversarial examples, better semantic evaluation methods, independent human validation, and improvements to reproducibility and reporting.

Read [CONTRIBUTING.md](CONTRIBUTING.md), [PRD](PRD.md), and [methodology](docs/METHODOLOGY.md). Run `bun run check` before submitting a pull request.

Whether you’re evaluating a local model or a commercial API, the objective remains the same: build systems that can think critically, recognize manipulation, and avoid making decisions they’ll regret. The current prototype does not execute an agent's tools or test access to infrastructure.

Because sometimes the biggest security vulnerability isn’t a zero-day exploit. It’s a questionable decision at the wrong time.

---

Licensed under [MIT](LICENSE). No affiliation with NVIDIA or the people referenced in news coverage.

Alice is fictional. The benchmark is real. The temptation to give your model a questionable score is entirely yours.
