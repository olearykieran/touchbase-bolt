# 📅 Roadmap: Free‑Tier Limits + Stripe Subscriptions

## 1. Audit Existing Logic

- Search for “sendMessage” / AI‑message handlers
- Search for “addContact” / contact‑creation endpoints
- Sketch current data flows and where to hook in checks

## 2. Schema & Usage Tracking (via Supabase/MCP)
+ - **Status:** ✅ Completed (added subscription_status, timestamps, weekly_message_count, last_message_reset, contact_count via migration)
1. **Profiles table**
   - Add `subscription_status` (enum: free, monthly, yearly)
   - Add `subscription_start` & `subscription_end` (timestamps)
   - Add `weekly_message_count` ( int, default 0)
   - Add `last_message_reset` ( timestamp)
   - Add `contact_count` (int, default 0)
2. **Migrations**
   - Write SQL migration via Supabase direct (MCP)
   - Deploy and verify in staging

## 3. Stripe Plans & Webhooks

- **Status:** ✅ Completed (created Stripe webhook endpoint via CLI, added secret, deployed function)
1. **Create Plans**
   - $2.99/month plan
   - $12.99/year plan
2. **Env & Keys**
   - Add `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
3. **Webhook Endpoint**
   - Handle `invoice.payment_succeeded` → set profile to active, reset usage
   - Handle `customer.subscription.deleted` → downgrade to free

## 4. Backend Enforcement Service

- **Message quota**
  1. On each send:
     - If free tier and `now – last_message_reset >= 1 week`, reset count
     - If free tier & count ≥ 3 → throw `PaymentRequiredError`
     - Else increment `weekly_message_count`
- **Contact quota**
  - If free tier & `contact_count` ≥ 3 → throw `PaymentRequiredError`
  - Else increment `contact_count`
- **Subscription check**
  - If status ≠ free → bypass quotas

## 5. Frontend Paywall UX

- Catch `PaymentRequiredError` on API calls
- Show modal/card:
  - “You’ve used 3 free messages this week” or “You’ve added 3 contacts”
  - Buttons: “Subscribe $2.99/mo” / “$12.99/yr”
- Show live usage counters (e.g. “2 of 3 messages used”)

## 6. Reset Jobs & Cleanup

- Scheduled job (cron or background task) to reset `weekly_message_count` and update `last_message_reset`
- Optional: daily aggregate cleanup

## 7. Testing & QA

- **Unit tests** for quota logic, edge cases
- **Integration tests** for Stripe webhook flows
- **Manual QA**: free tier → block after limits; paid tier → unlimited

## 8. Deploy & Monitor

- Deploy schema migrations, backend, webhook
- Add monitoring/alerts on webhook failures or quota hits
- Roll out to users

---

Feel free to refine any step names/endpoints to match your codebase. Let me know if you want to drill into any phase!
