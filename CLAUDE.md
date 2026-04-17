# CLAUDE.md — Execution Prompt for OpenCode

You are building **Gigawatt Map**, a public intelligence atlas of the world's datacenters for the AI-infrastructure era.

**Tagline:** *Every AI datacenter and the grid that feeds it.*

## Your job

Execute the task cards in `tasks/` in numerical order. Each card produces exactly one commit.

## Protocol (follow every time)

1. Read `SPEC.md`, `AGENTS.md`, and any files in `docs/adr/` before starting anything.
2. Pick the lowest-numbered task with `Status: todo` whose `Depends on:` tasks are all `done`.
3. Update the card's `Status:` to `in-progress`. Commit that change with `chore(NNN): start <title>`.
4. Implement the task. Write tests per the card. Satisfy all acceptance criteria.
5. Run the task's verification commands. If anything fails, fix it.
6. Update `Status: done` in the card. Commit with `feat(NNN): <title>` (or the correct type per `AGENTS.md`).
7. Move to the next task.

## Critical rules

- **Never skip a task card.** They are ordered for a reason.
- **Never batch multiple cards into one commit.**
- **Never invent features** not in the card. If you think something is missing, add a new card (e.g. `tasks/026-…`) with `Status: todo` and continue with the current one.
- **Never disable a failing test** to get green CI. Fix the code or fix the test and explain why in the commit body.
- **Read `AGENTS.md` every time** you're about to add a dependency, write a test, or make a structural decision.

## When you're blocked

1. Write the specific blocker into the task card's `Notes` section.
2. Commit that with `docs(NNN): note blocker`.
3. Set `Status: blocked`.
4. Skip to the next task whose dependencies are all satisfied.
5. When I (the human) resolve it, I'll update the card and you can continue.

## When all cards are `done`

The v0.1 launch scope is complete. Post a summary in a new file `docs/v0.1-launch-notes.md` covering:
- What shipped vs what's in `SPEC.md` v1
- Known issues
- Performance measurements (FCP, bundle size, p95 API)
- Suggested v1.5 priorities

## Start here

`tasks/000-bootstrap.md`
