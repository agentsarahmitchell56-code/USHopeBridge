# EAZREAL / HOPEBRIDGE Security and Release Readiness Review

Date: 2026-11-11
Branch: audit/eazreal-security-readiness

## Scope and safety boundary

This review branch is based on `feature/eazreal-social-network`. No production database changes, migrations, merges, or production deployments are performed by this review.

## Confirmed application state

- PR #30 contains the current EAZREAL social-network foundation and signup OTP UI.
- The signup page calls Supabase `signUp`, `verifyOtp(type: "signup")`, and `resend(type: "signup")`.
- The social foundation migration creates member profiles, follows, friend requests, text posts, likes, one-to-one conversations, and messages.
- The current community page is text-post based. The current DM page is text-only and polls messages every five seconds.
- The social migration is not confirmed applied to production.
- SMTP settings were reported saved by the project owner; delivery still requires a real end-to-end test with a fresh address.

## Issues requiring code or database follow-up

### 1. Social migration review

Before applying the social migration, verify:
- The final SQL includes RLS policies and explicit grants for both DM tables.
- DM conversation creation and message insertion enforce accepted-friend status, not just membership in a conversation.
- Friend-request updates cannot alter requester/recipient identity or rewrite an accepted/declined request back to pending.
- Profile updates cannot change protected identity fields such as `user_id`, `member_id`, or `handle` without validated server-side rules.
- Existing member rows and auth trigger behavior are safe for already-registered users.
- Required unique constraints, indexes, and foreign keys are present.

### 2. Signup and email delivery

- Confirm the Supabase Confirm signup template uses `{{ .Token }}` for the six-digit OTP flow.
- Verify sender address and SMTP username are the same account.
- Test a fresh registration, OTP delivery, successful verification, session creation, sign-in, and resend rate limits.
- Inspect Supabase Auth logs for provider rejection or delivery errors.
- Do not treat saved SMTP credentials or HTTP 200 on the page as proof of successful email delivery.

### 3. Security advisor findings

The Supabase advisor reported:
- Four public-schema tables with RLS enabled and no policies. Determine whether each is intentionally service-role-only or accidentally inaccessible before adding policies.
- Security-definer functions with broad execution grants. Inspect each function body and caller before narrowing grants; do not revoke access blindly.
- Leaked-password protection is disabled. Enable it after confirming the project's auth configuration and user experience.
- Multiple permissive policies and RLS performance advisories. Consolidate only after checking the effective policy logic and query patterns.

### 4. Social product gaps

Not yet complete in the current branch:
- Photo/video post creation and secure media storage.
- Comments and richer reactions.
- Persistent in-app notifications.
- Realtime messaging and message read/delivery states.
- Profile photo upload and profile editing UX.
- Robust mobile inbox and feed interactions.

### 5. HOPEBRIDGE regression coverage

Retest without changing existing behavior:
- Public application submission and reference generation.
- Application status lookup.
- Public customer support chat and attachments.
- Staff inbox, staff permissions, applications, analytics, and business workspace.
- Mobile layout and install/PWA behavior.

## Release gates

1. Complete code and SQL review.
2. Run type-check, lint, production build, and available automated tests.
3. Apply database changes only to a non-production/staging project first.
4. Test signup and OTP with a fresh email address.
5. Test all social and HOPEBRIDGE flows against the staging schema.
6. Review preview deployment.
7. Obtain explicit production approval before merge, migration, or production deployment.

## Explicitly not done

- No production SQL executed.
- No production migration applied.
- No pull request merged.
- No production deployment triggered.
- No claim of end-to-end signup or social functionality verified.
