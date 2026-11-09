# Platform customer-message retention operations

## Policy scope
- Delete a business-page conversation and all of its messages/attachments 12 calendar months after the customer's most recent message.
- A new customer message resets the retention clock.
- Business replies do not reset the customer-activity clock.
- This job is intentionally limited to `business_page_conversations`, `business_page_messages`, and objects in the `business-private-media` bucket referenced by those messages.
- It does not delete business accounts, public posts, profile media, HOPEBRIDGE applications, application uploads, or legacy HOPEBRIDGE support chats.

## Enablement requirements
1. Review and apply migration `20261109000005_platform_business_message_retention.sql` to the intended Supabase project.
2. Set a high-entropy `CRON_SECRET` in the Vercel Production environment. Do not put the value in source control or send it in chat.
3. Deploy the approved production version containing `vercel.json`; Vercel invokes `/api/cron/retention` daily at 03:00 UTC and sends the configured cron authorization header.
4. Confirm the scheduled invocation returns HTTP 200 and review Vercel function logs for failures. The endpoint processes at most 100 conversations per run; additional expired conversations are handled on subsequent runs.
5. Do not publish the proposed retention promise until the migration, secret, production schedule, and successful cleanup are verified.

## Failure handling
- If storage deletion fails for a conversation, its database records are retained for a later retry.
- If database deletion fails after storage deletion, the conversation records remain and the failure is logged. Investigate before manually retrying.
- The job uses a service-role-only database function and constant-time secret comparison.
