# EAZREAL monetization rollout

## Launch decision captured
- Market: Nigeria first; prices denominated in NGN.
- Initial revenue model: business subscriptions.
- Next revenue stream: promoted business posts, released only after the subscription and billing foundation is reliable.
- Personal accounts remain free during the audience-growth phase.
- Offer an introductory trial before charging.

## Current implementation boundary
This branch adds only the database foundation for business plans, one subscription per business page, transaction records, and idempotent webhook-event tracking. All four tables are server-only: browser roles have no grants and no RLS policies. No payment is collected by this change. Proposed plan prices are seeded inactive and must be explicitly approved before activation.

## Proposed pricing for owner review
| Plan | Proposed monthly price | Intro trial |
|---|---:|---:|
| Starter | ₦5,000 | 14 days |
| Pro | ₦12,000 | 14 days |
| Premium | ₦25,000 | 14 days |

These are initial product proposals, not validated market prices or active offers.

## Required next implementation stages
1. Build server-only billing endpoints and a business billing page that reads plan and subscription state without exposing service-role credentials.
2. Select Paystack or Flutterwave after checking current business onboarding requirements, fees, settlement, recurring billing support, and webhook documentation.
3. Create checkout sessions server-side. Never trust a client success redirect as proof of payment.
4. Verify each payment with the provider API and verify webhook signatures before changing subscription state.
5. Make webhook processing idempotent using the unique provider event ID and provider transaction reference.
6. Reconcile provider amount, currency, reference, business page, and subscription before marking a transaction successful.
7. Add renewal, failed-payment grace period, cancellation, refund, and expiry handling.
8. Enforce paid features server-side; hiding a button in the UI is not access control.
9. Add admin revenue reporting from verified transaction records, with audit trails and role checks.
10. Add promoted posts only after subscriptions, moderation, ad labeling, and targeting controls are ready.

## Safety and release gates
- Never store card numbers, CVV, PINs, or bank credentials.
- Keep provider secret keys and Supabase service-role keys in server environment variables only.
- Never allow a browser request to set a subscription to active or a payment to successful.
- Test successful, failed, duplicate, delayed, refunded, and out-of-order webhook events.
- Test plan changes, expired trials, cancellations, and business ownership changes.
- Run migrations and integration tests against a disposable database before any production migration.
- Keep this work in a separate pull request. Do not merge, deploy, or mutate the production Supabase database without explicit approval.
