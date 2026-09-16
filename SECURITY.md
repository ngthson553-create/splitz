# Security Policy

## Reporting a vulnerability

Please **do not** report security issues through public GitHub issues, pull
requests or discussions.

Use GitHub's private vulnerability reporting instead: open the **Security** tab
of the repository and click **Report a vulnerability**. That opens a private
advisory visible only to the maintainers.

If you cannot use that flow, contact the maintainer through their GitHub profile
(https://github.com/ngthson553-create).

Please include:

- what the issue is and which part of the project it affects,
- steps to reproduce, or a proof of concept if you have one,
- the impact you believe it has (what an attacker could do),
- any suggested fix if you have one in mind.

We will acknowledge your report as soon as we can, keep you updated on the fix,
and credit you in the advisory unless you prefer otherwise.

## Scope

This repository contains the client application, the database migrations and the
Supabase Edge Functions. In scope:

- authentication and authorisation flaws (including bypassing the console gate in
  `supabase/migrations/0020_admin_console_foundation.sql` or any RLS policy),
- leaking another user's data through a query, an RPC or an Edge Function,
- privilege escalation to a console role (`owner`, `operator`, `support`,
  `readonly`),
- injection or unsafe rendering in the client,
- payment or subscription logic that can be abused (for example granting a
  premium plan without paying).

Out of scope:

- vulnerabilities in third-party services (Supabase, PayOS, Resend, PostHog,
  Sentry, Zalo, Google) — report those to the respective vendor,
- issues that require a compromised device, a malicious browser extension, or
  physical access,
- missing hardening headers or best-practice findings with no demonstrable
  impact,
- anything requiring the repository's own demo deployment credentials, which are
  not part of this project.

## Handling secrets

No credential belongs in this repository. Configuration is read from environment
variables (`VITE_*`, see `.env.example`) for the client and from Supabase secrets
(`supabase secrets set ...`) for the Edge Functions.

If you find a committed secret, treat it as compromised and report it privately —
do not open a public issue about it.

## Supported versions

The project ships from the `main` branch. Security fixes land there; there are no
maintained release branches.
