# Project Skills

Skills mirrored from [google-labs-code/design.md/.agents/skills](https://github.com/google-labs-code/design.md/tree/main/.agents/skills). Mandated by user for this project.

## Installed

| Skill                                                       | Purpose                                                                | Applies to                                                             |
| ----------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [agent-dx-cli-scale](agent-dx-cli-scale/SKILL.md)           | Score CLI/npm scripts on agent-friendliness (0–21 scale, ≥18 required) | `package.json` scripts, any script in `scripts/`                       |
| [design-md](design-md/SKILL.md)                             | Synthesize semantic design systems into `DESIGN.md`                    | DESIGN.md authoring, design-token reconciliation                       |
| `ink` (NOT installed)                                       | Ink terminal renderer for JSON specs                                   | N/A — terminal UI; site is web. Deliberately skipped.                  |
| [tdd](tdd/SKILL.md)                                         | Red-Green-Refactor for TS/Node                                         | All component conversions, all `src/lib/*.ts` and `src/data/*.ts` work |
| [typed-service-contracts](typed-service-contracts/SKILL.md) | Spec & Handler pattern with `Result<T, E>`                             | `src/data/*.ts`, `src/lib/*.ts`, any data parsing/validation           |

## Mandate

When working on this project:

1. **Before writing any code** — read the relevant skill's `SKILL.md`. The skill governs HOW you work; project guidance (DESIGN.md, openspec specs) governs WHAT.
2. **TDD is mandatory** for new components, new data parsers, new utility functions. No "I'll write a test later."
3. **Typed-service-contracts is mandatory** for any code that parses external input (frontmatter, JSON, query strings, env vars). No `JSON.parse(x)` without a Zod parse + Result wrapper.
4. **Agent-DX score** any new npm script ≥18/21 before committing.

## Tool integration

`@google/design.md@0.1.1` is installed via npm:

- `npx design.md lint DESIGN.md` — validate the design contract
- `npx design.md diff <old> <new>` — compare design versions
- `npx design.md export DESIGN.md --format dtcg` — export to DTCG format
- `npx design.md export DESIGN.md --format tailwind` — export to Tailwind config
- `npx design.md spec` — print the format specification

Already wired in `package.json:58`: `"lint:design": "npm run check:oklch-hex-parity && design.md lint DESIGN.md"`.

## Refresh skills

Pull latest from upstream:

```bash
# `ink` is intentionally NOT in this loop — it is the terminal-renderer
# skill and the site target is web (skipped per the table above).
for s in agent-dx-cli-scale tdd typed-service-contracts; do
  curl -sf "https://raw.githubusercontent.com/google-labs-code/design.md/main/.agents/skills/$s/SKILL.md" -o ".agents/skills/$s/SKILL.md"
done
```

## Authority order

1. **User instructions** (CLAUDE.md, AGENTS.md, direct request) — highest
2. **Skills** (these) — override default agent behavior
3. **DESIGN.md** + **openspec/specs/\*** — project facts and contracts
4. **Default behavior** — lowest
