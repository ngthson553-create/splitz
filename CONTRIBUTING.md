# Contributing to Splitz

Thanks for taking the time to contribute. This document describes how to get a
working environment, the conventions the codebase follows, and what a good pull
request looks like.

By participating you agree to follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## Ways to contribute

- **Report a bug** — open an issue using the bug report template. Include the
  steps to reproduce, what you expected, and what happened.
- **Request a feature** — open an issue using the feature request template.
  Explain the problem you're solving, not only the solution you have in mind.
- **Send a pull request** — bug fixes, docs improvements and small features are
  all welcome. For larger changes, please open an issue first so we can agree on
  the approach before you invest time in it.
- **Report a security issue** — do **not** open a public issue. See
  [SECURITY.md](SECURITY.md).

## Development setup

Requirements: **Node.js 22** (see `.nvmrc`) and npm.

```bash
git clone https://github.com/ngthson553-create/splitz.git
cd splitz
npm install
npm run dev
```

The app starts at http://127.0.0.1:5173/ in **local mode** — no backend, no
account, data kept in `localStorage`. That is enough for working on the
settlement engine, the UI and most features.

To work on cloud-only features (multi-device sync, auth, premium, push, the
admin console) you need a Supabase project. See `.env.example` for the full list
of variables and the notes below.

### Cloud mode in short

1. Create a Supabase project.
2. Apply the migrations in `supabase/migrations/` in filename order
   (`supabase db push`, or paste them into the SQL editor).
3. Copy `.env.example` to `.env.local` and fill in `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY`. The app switches to cloud mode automatically once
   both are present.
4. Grant yourself console access if you want to work on `/console` — see the
   bootstrap note at the end of `supabase/migrations/0020_admin_console_foundation.sql`.

Edge Functions are Deno modules under `supabase/functions/`. Deploy them with
`supabase functions deploy <name>`; their secrets are set with
`supabase secrets set`, never in `.env.local` and never in the repo.

## Before you open a pull request

Run the same checks CI runs:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

All four must pass. A few conventions worth knowing:

- **The settlement engine is the core of the project.** `src/lib/settlement/`
  is covered by tests that encode the rounding rules and the transfer-reduction
  guarantees. Change the engine together with its tests, and never weaken a test
  just to make it pass.
- **Money is stored in minor units** (integer VND). Do not introduce floats.
- **Read the existing patterns before adding new ones.** Data access goes
  through the repositories in `src/lib/data/`; screens live under
  `src/features/<feature>/`; shared primitives are in `src/components/ui.tsx`.
- **Keep user-facing copy in Vietnamese.** The product ships to Vietnamese users;
  code, comments and docs may be in either language.
- **Comments explain constraints, not history.** Say why something must be the
  way it is, not what the next line does or which change introduced it.

## Commit messages

Short, imperative, one line. A body is welcome when the change needs context.
Following [Conventional Commits](https://www.conventionalcommits.org/) prefixes
(`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`) is appreciated but not
required.

## What we are unlikely to merge

- Rewrites of working areas without a concrete problem to solve.
- New runtime dependencies for something the standard library or an existing
  dependency already does.
- Changes that move business logic into the client for conveniences, or that
  weaken the row-level security policies.
- Committed secrets. If you need a key, use an environment variable or a
  Supabase secret.

## License

By contributing you agree that your contributions are licensed under the
[Apache License 2.0](LICENSE), the same license that covers the project.
