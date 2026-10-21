# HOPEBRIDGE Independent Platform + Meta Integration Plan

## Customer journey requirements (owner-approved)
- Customer account creation and login are optional convenience features, never a prerequisite for applying or contacting support.
- The public flow is: optional Sign up / Log in → application form → submission confirmation with reference number → status tracking and authorized amount/status updates.
- Show “Application submitted successfully” only after the server confirms the application was saved.
- Use an approved status message such as “Congratulations, your application has been approved” only when staff have actually changed the application to Approved. Do not imply approval at submission time.
- Show an assistance amount only when staff have recorded a verified/authorized amount; never invent or automatically promise an amount.
- Keep a floating “Chat with Support” button visible across public pages and on mobile, including the form, submission confirmation, and status tracking pages.
- Customer support chat must not require staff login. Staff authentication remains mandatory only for staff/admin tools. If customer identity verification is needed for private application details, use a reference number plus a suitable verification step rather than forcing a full customer account.
- Test the whole journey on narrow mobile screens as well as desktop.

## Goal
Keep HOPEBRIDGE usable independently of Facebook while connecting to Facebook only through Meta-authorized APIs. This project must not attempt to bypass Page restrictions, automate around enforcement, or promise immunity from restrictions.

## Existing stack
- Next.js App Router / TypeScript
- Supabase for application data and authentication
- Vercel deployment
- Existing application submission, status tracking, staff dashboard, and support chat

## Phase 1 — Stabilize the independent core
- Verify application submission works end-to-end and return a clear reference number only after the database confirms success.
- Verify status tracking and customer support chat independently of Facebook.
- Keep public application and conversation inserts behind server-side validation; never expose the Supabase service-role key to the browser.
- Keep staff routes protected by server-verified authorization and Supabase Row Level Security.
- Add basic rate limits, input validation, upload size/type checks, and safe error messages.
- Add privacy policy, terms, organization/contact details, and a clear statement that applications do not guarantee approval or funding.

## Phase 2 — Build audience ownership
- Add an opt-in email subscription form with explicit consent, unsubscribe support, and a minimal subscriber record.
- Store public updates on HOPEBRIDGE first; treat Facebook as a distribution channel, not the canonical content store.
- Export/back up content and subscriber records securely. Do not collect sensitive application details for marketing.
- Add a simple content library and post status: draft, approved, published, failed.

## Phase 3 — Official Meta integration
- Create a Meta developer app owned by the organization and configure Facebook Login / the relevant Pages product.
- Use the official authorization flow. Request only permissions required for the selected functions, such as Page listing and publishing, subject to Meta approval and eligibility.
- Store access tokens only server-side in encrypted/managed environment storage; never put them in client JavaScript, URLs, logs, or Git.
- Implement connection state, token expiry/error handling, explicit disconnect, and audit logs.
- Add a preview-and-confirm publishing flow. A scheduled item must not be shown as published until Meta confirms success.
- Use Meta's current documentation and App Review requirements; API access and publishing are not guaranteed until Meta grants the necessary access.

## Phase 4 — Test before production
- Test on a private/test Page and a non-production environment.
- Verify authorization, permissions, token expiry, rejected posts, duplicate submissions, retries, and disconnect behavior.
- Keep a manual publishing fallback and make sure the website continues working if Meta is unavailable or the Page is restricted.
- Review privacy, consent, data retention, and any applicable grant/charitable solicitation requirements before public promotion.

## Hosting and budget notes
- Keep the existing Vercel URL for initial testing and use the existing Supabase project where suitable.
- Check current free-tier terms before using Vercel Hobby for a public financial-assistance service: its documented terms restrict Hobby use to personal/non-commercial projects. Do not assume the current public service qualifies for free commercial hosting.
- Supabase free-tier limits and availability should also be checked before relying on it for production.
- Do not add paid services, a domain, or production Meta credentials without the owner's approval.

## First implementation checklist
1. Fix and regression-test application submission first.
2. Verify the public no-login chat flow and keep the floating chat button visible.
3. Verify status tracking and approved amount display.
4. Audit RLS, upload validation, and staff authorization.
5. Add opt-in audience capture and a content library.
6. Implement Meta integration only after the independent core passes tests.
