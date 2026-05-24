# Setup Guide — From Zero to First Claude Code Session

Read this once before doing anything. It walks you through every step from "I have a zip of files" to "Claude Code is building my app."

## What you have

You're downloading a folder named `fitness-app-scaffold/` containing:

- `CLAUDE.md` at the root — the project orchestrator
- `.claude/agents/` — 13 specialist agent files
- `.context/` — knowledge library (strategy, architecture, decisions, theory, api)
- `SETUP.md` — this file

That's everything. There is no actual code yet — the scaffold defines *how* code will be written, not *what* code. Claude Code will write the code in the bootstrap session.

## Step 1 — Set up the repository

Pick a parent folder on your machine where your projects live. For example: `~/Projects/`. Then:

```bash
cd ~/Projects
mkdir fitness-app
cd fitness-app
git init
```

Copy the contents of the zip into this folder. After unzipping, your folder should look exactly like this:

```
~/Projects/fitness-app/
├── CLAUDE.md
├── SETUP.md                       ← this file
├── .claude/
│   └── agents/
│       ├── system-architect.md
│       ├── mobile-architect.md
│       ├── data-sync-engineer.md
│       ├── backend-engineer.md
│       ├── security-guardian.md
│       ├── fitness-domain-expert.md
│       ├── ux-flow-architect.md
│       ├── qr-and-deeplink-specialist.md
│       ├── notifications-engineer.md
│       ├── health-integration-specialist.md
│       ├── code-reviewer.md
│       ├── feature-tracker.md
│       └── note-keeper.md
└── .context/
    ├── api/README.md
    ├── architecture/local-first-sync.md
    ├── decisions/
    │   ├── 0001-exercisedb-over-wger.md
    │   ├── 0002-powersync-over-watermelondb.md
    │   ├── 0003-drizzle-over-prisma.md
    │   └── 0004-second-opinion-review.md
    ├── features/                  ← created on first feature-tracker invocation
    ├── notes/                     ← created on first note-keeper invocation
    ├── strategy/
    │   ├── competitor-analysis.md     ← REPLACE THIS
    │   └── stack-validation-2026.md   ← REPLACE THIS
    └── theory/README.md
```

The `.claude` and `.context` folders start with a dot — they are hidden on macOS. If your file manager doesn't show them after unzipping, press Cmd+Shift+. (period) to toggle hidden files.

Verify the layout with:

```bash
ls -la
find .claude .context -type f | sort
```

You should see all 13 agent files and the context files.

## Step 2 — Replace the two placeholder strategy files

Two files are placeholders that you replace with content from your existing project knowledge:

**`.context/strategy/competitor-analysis.md`** — replace with your existing "Digital Strength Training Architectures: A Comparative Study" document.

**`.context/strategy/stack-validation-2026.md`** — replace with the deep research artifact "2026 Fitness App Stack: Validated Architecture and Strategic Refinements" that was generated in our conversation. Copy the whole markdown out and paste it in.

The agents will work without these (they have the key points inlined), but you lose the ability to ask "look up exactly what Hevy does on X" later.

## Step 3 — Add a `.gitignore`

Create a file at the project root called `.gitignore` with at minimum:

```
# Dependencies
node_modules/
.pnpm-store/

# Build outputs
dist/
build/
.expo/
.expo-shared/
.next/

# Native
ios/Pods/
ios/build/
android/.gradle/
android/build/
android/app/build/

# Env
.env
.env.local
.env.production
.env.*.local

# Editor
.vscode/
.idea/
.DS_Store

# Logs
*.log
npm-debug.log*

# Testing
coverage/
.nyc_output/

# Sentry
.sentryclirc
```

Important: `.env*` is in there but `.env.example` is NOT excluded — the example file is committed (with dummy values), the real one is not.

Now commit the scaffold:

```bash
git add .
git commit -m "chore: initial agent scaffold and project context"
```

## Step 4 — Install Claude Code

If you haven't already, install Claude Code from Anthropic. The recommended install path is:

```bash
npm install -g @anthropic-ai/claude-code
```

Then run `claude` from your project directory. The first time you run it, it will ask you to authenticate. Follow the prompts.

If you'd rather not install globally, you can run it via `npx` each time:

```bash
npx @anthropic-ai/claude-code
```

For the most accurate install instructions for your platform, check Anthropic's documentation at `docs.claude.com` — the install method occasionally changes.

## Step 5 — Verify the scaffold (Quickstart Session 1)

Open a terminal in your project root and run `claude` to start a Claude Code session.

When the prompt appears, paste this exact command:

> Read CLAUDE.md and list every agent in .claude/agents/. For each, summarize in one sentence what it owns and when it should be invoked. Confirm the routing guide in CLAUDE.md is consistent with the agent files. Do not make any code changes — this is a read-only verification.

Claude Code will read all 13 agents and give you a one-line summary of each. This serves three purposes: it confirms the agents are picked up correctly, it reveals any contradictions between CLAUDE.md and the individual agents, and it warms up Claude's context so subsequent sessions know what's where.

**Expected outcome:** A bulleted list of 13 agents with one-line descriptions. If something is missing or contradictory, fix it before moving to Session 2.

End the session with `/exit` or Ctrl-D.

## Step 6 — Bootstrap the monorepo (Quickstart Session 2)

Start a fresh Claude Code session. Paste this command:

> Use the system-architect agent to plan and bootstrap the initial monorepo. Create a pnpm workspace with Turborepo, set up `package.json` files at the root and for each app and package listed in CLAUDE.md (apps/mobile, apps/worker, packages/domain, packages/data-sources, packages/transforms, packages/sync, packages/ui, packages/fitness-logic), add a TypeScript config, an ESLint config, a Prettier config, and a `.env.example` at the root. Use TypeScript strict mode everywhere. Do NOT install dependencies yet, do NOT write any feature code, do NOT initialize Expo. Just create the workspace skeleton. After creating files, run `pnpm install` and confirm the workspace is healthy.

This is the longest session — expect it to take 10-15 minutes of back-and-forth. The system-architect will propose a plan, you approve it, and Claude Code creates all the files.

**Expected outcome:** A working pnpm workspace where `pnpm install` succeeds, `pnpm typecheck` runs (even if there's nothing to check yet), and the folder structure matches the layout in CLAUDE.md.

When the session ends, commit:

```bash
git add .
git commit -m "chore: bootstrap pnpm workspace and Turborepo"
```

## Step 7 — Seed the trackers (Quickstart Session 3)

Start a fresh Claude Code session. Paste this command:

> Invoke the feature-tracker agent and have it create `.context/features/feature-ledger.md` with the seed feature entries listed in its agent file (feat-001 through feat-038). Then invoke the note-keeper agent to create `.context/notes/idea-log.md`, `.context/notes/decisions-log.md`, and `.context/notes/overrides.md` with their initial seed content. Finally, do a one-paragraph summary of what was created.

**Expected outcome:** Four new files in `.context/`, each populated with the seed content from the agent definitions. From this point on, every session that produces a decision, idea, or feature will be logged here automatically.

Commit:

```bash
git add .
git commit -m "chore: seed feature ledger and decision logs"
```

## Step 8 — You are now ready to build features

Every subsequent session follows this pattern:

1. Open Claude Code in the project root.
2. Describe what you want to build in plain language.
3. Claude Code reads CLAUDE.md, identifies which specialists apply, and routes accordingly.
4. The relevant agent (or agents) plans the change, asks you for approval, and implements.
5. The code-reviewer agent runs at the end to verify nothing violates the rules.
6. If env/auth/RLS/packages were touched, the security-guardian also runs.
7. The feature-tracker logs any new features and the note-keeper logs any decisions or deferred ideas.
8. You commit.

## Suggested first real feature (after the three quickstart sessions)

> Use the data-sync-engineer to design and implement migration 0001: the initial schema with users, equipment, exercises, routines, workout_sessions, and workout_sets. Include the three sharing-seam columns on routines (visibility, is_shareable, origin_id), the external_sync_id and sync_source columns on workout_sessions and workout_sets, and full RLS policies using the (select auth.jwt() ->> 'sub') pattern with indexes on every RLS-referenced column. Generate the Drizzle schema in packages/sync/src/schema.ts, the SQL migration in supabase/migrations/0001_initial.sql, and the PowerSync Sync Streams config in packages/sync/src/streams.ts. Run all 10 sync-rules test scenarios mentally and confirm the design passes. Have the code-reviewer and security-guardian both audit the result.

This is your first "real" engineering session and will validate the entire scaffold against an actual deliverable.

## What to do when an agent says something you disagree with

You have three options:

1. **Just fix it** — let the agent rewrite to match its rules.
2. **Discuss** — ask the agent "explain why this rule exists, citing the relevant file." If after the explanation you still want to do it your way, go to option 3.
3. **Override** — type something like `override: I'm prototyping the input flow and want to use the system keyboard for now`. The note-keeper will log the override. The code-reviewer will surface it before you ship to production, at which point you must either resolve it or document why it ships anyway.

This is balanced strictness. The agents push back; you decide.

## Tips

**Keep CLAUDE.md short.** Resist the urge to keep adding rules to it. Add detail to the relevant agent file instead. The orchestrator is for routing, not for everything.

**Use the note-keeper liberally.** Whenever a session surfaces something you want to think about later, end the session with: "Note-keeper: log this idea — [the idea]." It takes 10 seconds and saves you from forgetting.

**The feature-tracker is your help-content brain.** Six months from now when you build a help center or an in-app coach, the feature ledger will be the source of truth for what every feature does and why. Treat it as documentation, not bookkeeping.

**Resist scope creep.** The scaffold is opinionated by design. When you find yourself wanting to add a feature that doesn't fit, ask why — the constraint is usually correct. The note-keeper logs deferrals; the feature-tracker logs intentional rejections.

**The first month is messy.** The agents will surface contradictions in their own rules. That is expected. Treat the first month as scaffold-tuning as much as feature-building.

## When something goes wrong

If Claude Code seems to ignore an agent: check that the agent file's YAML frontmatter is correct. The `name`, `description`, and `tools` fields are required. The frontmatter must be the first thing in the file, between two `---` lines.

If two agents contradict each other: this is a real problem. Fix the contradiction before continuing. The note-keeper logs the resolution.

If Claude Code says "I cannot find CLAUDE.md": you're not in the project root. Run `pwd` and `cd` to the right place.

If a session goes off the rails: end it (Ctrl-C, then `/exit`), and start a new one. Sessions are cheap. Restarting clears stale context.

## You are ready

The scaffold is ready. The plan is documented. The agents are defined. You have a clear path from "empty repo" to "shipping app."

Start with Session 1. Take it one session at a time.
