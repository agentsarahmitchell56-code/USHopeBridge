# HOPEBRIDGE US advertising and conversion-readiness checklist

**Status: DO NOT LAUNCH CAMPAIGNS.** This is an operational checklist, not legal advice or a certification that the program is compliant.

## What is known / what is not verified

- Operator name supplied: **HopeBridge**.
- Service described: grants or charitable financial assistance.
- Intended audience: people in the United States.
- The public website accepts assistance requests. Submission does **not** guarantee eligibility, approval, or payment.
- The code does not establish the operator's legal entity, EIN, IRS tax-exempt status, state charitable registrations, source and availability of funds, eligibility criteria, award process, actual grant terms, or physical/contact address. Do not imply these have been verified.
- Do not describe HopeBridge as a government agency, government-funded program, registered charity, or IRS-recognized 501(c)(3) unless independently verified and legally authorized to make that claim.

## Required before any US campaign

1. **Identify the operator.** Publish the full legal entity name (or clearly identify the individual/business operator), mailing address, monitored contact channel, and the relationship between the operator and any funding charity or sponsor.
2. **Document the actual program.** Verify that assistance funds exist and can be awarded; document eligibility, application windows, selection criteria, geographic limits, award amounts/ranges if known, decision process, payment timing, fees (if any), and how applicants are notified. Do not invent these details or imply guaranteed funding.
3. **Substantiate every claim.** Ads, landing pages, video, testimonials, logos, and urgency statements must be truthful, supported, authorized, and consistent. No fake testimonials, fabricated award examples, fake balances/transfers, unsupported “official” claims, or misleading government/charity affiliations.
4. **Review state and federal obligations.** Have US counsel assess applicable FTC Act/deceptive-practices requirements, state consumer-protection and privacy laws, and any state charitable-solicitation registration/disclosure rules if the operator solicits donations or raises funds. A program that distributes assistance is not automatically a charity or a tax-exempt organization.
5. **Verify tax-exempt claims.** If claiming 501(c)(3) status or tax-deductible donations, verify the exact legal entity and IRS status and ensure claims accurately describe the relationship. Do not use tax-deductibility language merely because the site provides assistance.
6. **Complete the legal pages.** Replace general placeholders with accurate operator identity/contact details, data processors, purposes, sharing, retention periods, applicable rights/request process, eligibility and program rules, governing terms where appropriate, and any legally required notices. Confirm the pages match actual operations before public promotion.
7. **Protect applicant data.** Limit staff access, define retention/deletion and incident-response processes, secure uploads and chat, and never put names, email/phone, requested amounts, application narratives, reference numbers, chat text, or other sensitive data into ad URLs, analytics events, pixels, or audience lists.
8. **Review platform policies before creating ads.** Re-check current Google Ads and Meta policies for misrepresentation, financial/charitable claims, sensitive personal attributes, data sharing, and destination requirements. Platform acceptance is not legal approval.
9. **Test the customer journey.** Test the public landing page, application success/failure, status tracker, support chat, privacy/terms links, mobile layout, and all claims using a non-real test application. Do not create fake testimonials or imply the test represents a real award.

## Conversion measurement implemented in this branch

- A first-party server log event named `HOPEBRIDGE_CONVERSION` is emitted only after the application record has been successfully inserted.
- The event includes only a generic event name, fixed source label, and timestamp. It deliberately excludes applicant identifiers, application/reference IDs, request details, amounts, IP address, and chat content.
- This is a privacy-minimizing operational signal visible in hosting logs; it is **not** a durable analytics dashboard, unique-person count, attribution system, or proof of an award. Hosting-log access and retention still need to be reviewed.
- No Meta Pixel, Google Ads tag, enhanced conversions, customer-list upload, retargeting, or third-party analytics integration is added. Assistance-seeking and financial-need information can be sensitive; Google restricts some sensitive-category conversion/customer-data uses. Do not send these events to ad platforms without a specific policy and legal review.
- If third-party measurement is later approved, add it only after the operator chooses providers, supplies verified IDs, updates disclosures, implements legally appropriate consent/choice controls, and tests that no sensitive application data is transmitted. Never place applicant information in event names, URLs, custom dimensions, or conversion payloads.

## Official guidance to review

- Google Ads misrepresentation: https://support.google.com/adspolicy/answer/6020955
- Google Ads policies, including financial products/services: https://support.google.com/adspolicy/answer/6008942
- Google Ads customer-data policy and sensitive-category restrictions: https://support.google.com/adspolicy/answer/7475709
- Google Analytics policy: https://developers.google.com/analytics/policy
- FTC guidance for online charitable giving portals and clear disclosures: https://www.ftc.gov/business-guidance/resources/online-charitable-giving-portals

**Release gate:** Do not launch until the operator identity, program legitimacy/funding, legal pages, state-law review, platform policy review, and end-to-end tests have been documented and approved.
