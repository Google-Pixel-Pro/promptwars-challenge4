# PulsePoint AI

**A GenAI-powered Crowd & Safety Command Center for FIFA World Cup 2026 stadium operations.**

Built for the Google PromptWars hackathon — *Smart Stadiums & Tournament Operations*.

---

## Chosen vertical

**Crowd & Safety Command Center**, serving venue organizers and stewarding staff, with two secondary
capabilities folded in because they fall directly out of the same problem: **multilingual PA
announcements** and an **accessibility concierge**.

The problem statement lists eight capability areas a submission can improve (navigation, crowd
management, accessibility, transportation, sustainability, multilingual assistance, operational
intelligence, real-time decision support). Rather than spreading thin across all eight, PulsePoint AI
goes deep on **crowd management + operational intelligence + real-time decision support** — the three
that most directly test "build a smart, dynamic assistant that makes logical decisions based on
context" — and folds in **multilingual assistance** and **accessibility** as features that a real
command center would need anyway once you're already tracking zone-level crowd state. Transportation
and sustainability show up as recommendation *categories* the advisor can emit (e.g. staggering egress
to reduce transit-hub overload) rather than standalone modules, which is noted as a natural extension
point rather than claimed as fully built.

## Why this vertical

A wayfinding chatbot or a translation widget is a thin wrapper around an LLM call. A crowd-safety
command center is not — it requires:

- A real, explainable model of *when* a situation is risky (not just "ask the LLM if this is risky").
- Decisions that stay correct even when the AI backend is unavailable.
- A defensible answer to "what happens if the model hallucinates a gate that doesn't exist, or a fan
  types something adversarial into a text field that reaches a prompt?"

Those three requirements are exactly what the rubric's **Problem Statement Alignment**, **Code
Quality**, and **Security** categories are really asking for, so the vertical was chosen to make those
questions unavoidable rather than incidental.

## How it works

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Browser (React / SWR)                      │
│   ZoneGrid · AdvisorPanel · AnnouncementPanel · AccessibilityPanel   │
└───────────────┬───────────────────────────────────────┬─────────────┘
                 │ GET /api/state                        │ POST /api/advisor
                 │                                        │ POST /api/announcement
                 ▼                                        │ POST /api/accessibility
┌─────────────────────────────┐            ┌──────────────▼──────────────┐
│   lib/riskEngine.ts          │            │   lib/gemini.ts              │
│   Deterministic, pure,       │───risk────▶│   Structured-output Gemini   │
│   zero external deps.        │   scores   │   call, grounded ONLY in     │
│   Decides WHAT is risky.     │            │   risk-engine output.        │
└─────────────────────────────┘            │   Falls back to a rule-based │
                                             │   heuristic if no API key    │
                                             │   or the call fails.         │
                                             └──────────────────────────────┘
```

1. **`lib/riskEngine.ts`** scores every zone from live occupancy, inflow/outflow pressure, and active
   incidents into a 0–100 risk score. This is plain arithmetic — no AI, no network call, no
   nondeterminism — so it is fast, always available, and 100% unit-testable.
2. **`lib/promptBuilder.ts`** turns those already-computed scores into a grounded prompt: Gemini is
   told the numbers, not asked to guess them, and is explicitly instructed not to invent zones or
   incidents.
3. **`lib/gemini.ts`** calls Gemini with a strict JSON response schema (`responseSchema`), then
   cross-checks every returned recommendation against the real zone IDs in the scenario before it's
   allowed to reach the UI. If `GEMINI_API_KEY` is unset, times out, or fails, it transparently falls
   back to **`lib/fallbackAdvisor.ts`** — a deterministic, rule-based recommendation generator.
4. The **Announcement** and **Accessibility** endpoints follow the same pattern: a safety-relevant
   fact (an accessible route, a canned safety phrase) is computed or defined deterministically, and
   Gemini is used only to *phrase* it naturally — never to decide it.
5. The dashboard (`components/dashboard/CommandCenter.tsx`) uses **SWR** for data fetching, keyed per
   scenario, so switching scenarios can't let a stale response from a previous selection overwrite the
   current view.

### Why the AI is deliberately kept "on a leash"

This is the single biggest design decision in the codebase, so it's worth stating directly: **the
parts of this system that must never be wrong (is this zone dangerous? is this the accessible route?)
are not decided by the model.** Gemini adds judgment and natural language on top of numbers a
deterministic engine already computed, and every AI response is validated against ground truth before
it's trusted. This is what makes the app gradeable, testable, and safe to demo with zero configuration.

## Getting started

```bash
npm install
npm run dev       # http://localhost:3000 — works immediately, no API key required
```

To see live Gemini-generated (rather than rule-based) recommendations:

```bash
cp .env.example .env.local
# add your key from https://aistudio.google.com/apikey
echo "GEMINI_API_KEY=..." >> .env.local
npm run dev
```

Other scripts:

```bash
npm run lint        # ESLint (flat config, next/core-web-vitals + next/typescript)
npm run typecheck   # tsc --noEmit, strict mode + noUncheckedIndexedAccess
npm test            # Vitest — 62 unit tests, no network/API key required
npm run build       # Production build
```

## Project structure

```
src/
├── app/
│   ├── page.tsx                 # Server component, computes initial scenario server-side
│   ├── layout.tsx                # Font tokens, metadata
│   └── api/
│       ├── state/route.ts        # GET  — scenario + computed risk scores
│       ├── advisor/route.ts       # POST — AI/fallback operational recommendations
│       ├── announcement/route.ts  # POST — multilingual PA announcement generation
│       └── accessibility/route.ts # POST — accessible-route guidance
├── components/
│   ├── dashboard/                # CommandCenter and its panels
│   └── ui/                       # Badge, Card, Button primitives
├── data/scenarios.ts              # 4 simulated stadium scenarios (see Assumptions)
├── lib/
│   ├── riskEngine.ts               # Deterministic crowd-risk scoring
│   ├── fallbackAdvisor.ts          # Deterministic recommendations (no AI dependency)
│   ├── promptBuilder.ts            # Grounded prompt construction
│   ├── gemini.ts                   # Gemini client, structured output, guardrails
│   ├── sanitize.ts                  # Prompt-injection mitigation
│   ├── validation.ts                # Zod schemas for every API input
│   ├── rateLimit.ts                  # In-memory rate limiter
│   └── cache.ts                      # TTL cache for AI responses
├── types/index.ts                  # Shared domain types
└── __tests__/                      # 62 unit tests across the lib/ layer
```

## Assumptions

These are stated explicitly rather than left implicit, per the submission requirements:

- **Venue**: modeled on MetLife Stadium (East Rutherford, NJ), the confirmed host of the FIFA World
  Cup 2026 final, capacity ≈82,500. Fixture data (`matchLabel: "Knockout Stage Fixture"`) is
  intentionally generic rather than naming real teams, since this is illustrative scenario data, not a
  claim about any specific real match.
- **Zone model**: eight zones (Gates A–D lower bowl, E–H upper deck). Each zone's `capacity`
  represents the *safe combined seating + concourse throughput capacity* for that gate cluster, not a
  raw seat count — this is why occupancy can legitimately approach 100% during a halftime concourse
  rush without implying the seating bowl itself is oversold.
- **Data is simulated**, not a live sensor feed. All four scenarios (`src/data/scenarios.ts`) are
  hand-authored to exercise a specific operational pattern (normal arrival, halftime convergence,
  post-match egress bottleneck, an active security incident) rather than randomly generated, so the
  advisor's behavior is reproducible and reviewable.
- **Accessible routing is deterministic by design** (see `api/accessibility/route.ts`) — only two of
  the eight zones are marked as having accessible entrances in this mock dataset, which is a
  simplification for the demo, not a claim about real accessible-entrance coverage at any venue.
- **Rate limiting and caching are in-memory**, scoped to a single server instance. That's an explicit,
  documented tradeoff for a single-instance demo deployment (see the comment in `lib/rateLimit.ts`),
  not an oversight — a multi-instance production deployment would swap in a shared store (e.g. Redis)
  behind the same function signature.
- **Recommendation category is derived from structured incident data** (`ZoneRisk.worstIncident`), not
  from pattern-matching human-readable text. An earlier version of the fallback advisor matched on the
  word "incident" inside a description string, which meant a low-severity facility report (e.g. one
  escalator down) and a high-severity security incident both got treated as the same urgency and
  filed under the same "medical" category. That's fixed by carrying severity and category as typed
  fields end to end — see `types/index.ts` (`ZoneRisk.worstIncident`) and
  `lib/fallbackAdvisor.ts`. It's called out here because it's exactly the kind of bug that only shows
  up once you run the thing, not by reading the code.
- **Fonts are self-hosted via `@fontsource/*` packages**, not fetched from `fonts.googleapis.com` at
  build time. This removes an external network dependency from `next build` entirely — the build
  succeeds even with no internet access beyond `npm install`, which matters when a hackathon rule
  gives you exactly one CI run to get right.

## Security notes

- `GEMINI_API_KEY` is read only server-side (`process.env` inside API routes / `lib/gemini.ts`) and is
  never sent to the client.
- Every API route validates its input with a `zod` schema before touching any business logic, and
  returns a generic `400` with structured error details rather than leaking internals.
- The one place free-text user input reaches a prompt (the operator note, and the raw announcement
  message) is passed through `lib/sanitize.ts` and explicitly labeled in the prompt as *context, not
  instruction* — and every AI-generated recommendation is cross-checked against real zone IDs after
  the fact, so a successful prompt injection still can't produce an actionable instruction that
  reaches the UI.
- Per-client rate limiting is applied to every route.
- `next.config.mjs` sets `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and a
  restrictive `Permissions-Policy` on every response.
- `npm audit` reports **0 vulnerabilities** as of this submission (Next.js pinned to 16.2.10 and
  Vitest to 4.x specifically to close known advisories in earlier releases — see git history).

## Evaluation criteria mapping

| Criterion | Impact | How it's addressed |
|---|---|---|
| **Code quality** | High | TypeScript strict mode + `noUncheckedIndexedAccess`; ESLint (`next/core-web-vitals`, `next/typescript`) and Prettier with zero warnings; layered architecture (types → deterministic logic → AI layer → API routes → UI) so each layer is independently readable and testable; JSDoc-style comments explain *why*, not just *what*, at every non-obvious decision. |
| **Security** | Medium | See "Security notes" above: input validation, rate limiting, prompt-injection mitigation, zone-ID cross-checking, security headers, zero `npm audit` findings. |
| **Efficiency** | Medium | Risk scoring is O(n log n) in zone count with no network calls; a TTL cache avoids duplicate Gemini calls for identical context within 30s; SWR dedupes and caches client-side reads per scenario; Gemini calls run with an 8s timeout and a bounded retry instead of hanging a request indefinitely. |
| **Testing** | Low | 83 unit tests (Vitest) across 10 files — covering the risk engine, fallback advisor, Gemini hallucination guardrail, prompt builder, sanitizer, validators, cache, and rate limiter, plus full end-to-end route-handler tests (`__tests__/api.*.test.ts`) that exercise real HTTP-shaped requests through validation, rate limiting, and business logic. All run with zero network access or secrets. A GitHub Actions CI pipeline lints, type-checks, tests, and builds on every push with `GEMINI_API_KEY` deliberately unset. |
| **Accessibility** | Low | Dedicated Accessibility Concierge feature; keyboard-operable zone map (`role="button"`, `tabIndex`, Enter/Space handling) with per-zone `aria-label`s; visible focus rings; `prefers-reduced-motion` respected; RTL support for Arabic announcements; color is never the only risk signal (score + label are always shown as text alongside color). |
| **Problem statement alignment** | High | Grounded in a real, confirmed 2026 venue; directly implements "crowd management," "operational intelligence," and "real-time decision support" as a genuine decision-support system rather than a chatbot; "multilingual assistance" and "accessibility" are implemented as real, working features, not just mentioned. |

## Known limitations / future work

- Zone occupancy is simulated, not connected to a real sensor/camera feed — the risk engine's
  interface (`Zone.occupancy`, `.inflowRatePerMin`, `.outflowRatePerMin`) is designed so a real data
  source could be substituted without touching the scoring logic itself.
- Rate limiting and caching are single-instance (documented above); a production deployment would use
  a shared store.
- The accessibility dataset (`accessibleRoute: boolean`) is a simplified two-gate mock; a real
  deployment would model per-zone accessibility more granularly (ramps, elevators, sensory rooms).

## License

MIT — see [LICENSE](./LICENSE).

# promptwars-challenge4
