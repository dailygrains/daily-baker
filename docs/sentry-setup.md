# Sentry Error Tracking Setup Guide

This guide walks you through setting up Sentry for error tracking and performance monitoring in Daily Baker.

## Purpose

Sentry provides:
- **Error tracking** - Catch and monitor JavaScript/TypeScript errors
- **Performance monitoring** - Track slow API routes and database queries
- **Session replay** - Watch video replays of user sessions with errors
- **Release tracking** - Monitor errors by deployment version
- **Source maps** - See original source code in error stack traces
- **Alerts** - Get notified when errors spike or new issues appear

---

## Prerequisites

- Sentry account (free tier available)
- Daily Baker repository deployed to Vercel
- GitHub repository access

---

## 1. Create Sentry Account

### Step 1: Sign Up

1. Go to https://sentry.io
2. Click "Get Started"
3. **Sign up with GitHub** (recommended for repository integration)
4. Authorize Sentry to access your GitHub account

### Step 2: Create Organization

1. **Organization name**: `dailygrains` (or your organization name)
2. Select team size
3. Click "Create Organization"

---

## 2. Create Project

### Step 1: Create New Project

1. In Sentry Dashboard, click **"Create Project"**
2. **Platform**: Select **Next.js**
3. **Alert frequency**: Receive alerts on every new issue (default)
4. **Project name**: `daily-baker`
5. Click **"Create Project"**

### Step 2: Save DSN

After project creation, you'll see the **DSN** (Data Source Name):

```
https://abc123def456@o123456.ingest.sentry.io/7890123
```

**Copy this** - you'll need it for environment variables.

---

## 3. Install Sentry SDK

The Sentry SDK is already installed in Daily Baker via `@sentry/nextjs`. If you need to install it manually:

```bash
npm install @sentry/nextjs
```

---

## 4. Configure Environment Variables

### Local Development

Add to `.env`:

```bash
# Sentry Error Tracking
NEXT_PUBLIC_SENTRY_DSN=https://abc123def456@o123456.ingest.sentry.io/7890123
SENTRY_ORG=dailygrains
SENTRY_PROJECT=daily-baker
SENTRY_AUTH_TOKEN=  # Leave empty for development (source maps not uploaded locally)
```

**Important**: The `NEXT_PUBLIC_` prefix makes the DSN available in browser code, which is safe and expected.

### Production (Vercel)

1. Go to Vercel project → **Settings** → **Environment Variables**
2. Add variables:

| Variable Name | Value | Environment | Secret? |
|--------------|-------|-------------|---------|
| `NEXT_PUBLIC_SENTRY_DSN` | `https://abc...@o...ingest.sentry.io/...` | Production, Preview | ❌ No |
| `SENTRY_ORG` | `dailygrains` | Production | ❌ No |
| `SENTRY_PROJECT` | `daily-baker` | Production | ❌ No |
| `SENTRY_AUTH_TOKEN` | `sntrys_xxxxx` (from step 5 below) | Production | ✅ Yes |

**Note**: `SENTRY_AUTH_TOKEN` is only needed for uploading source maps in production builds.

---

## 5. Generate Sentry Auth Token

Auth tokens are required to upload source maps to Sentry.

### Step 1: Navigate to Auth Tokens

1. Sentry Dashboard → **Settings** → **Auth Tokens**
2. Or direct link: https://sentry.io/settings/account/api/auth-tokens/

### Step 2: Create New Token

1. Click **"Create New Token"**
2. **Token name**: `Vercel Daily Baker Deployments`
3. **Scopes**: Select:
   - ✅ `project:read`
   - ✅ `project:releases`
   - ✅ `org:read`
4. **Project**: Select `daily-baker` (or leave "All" if you want to reuse token)
5. Click **"Create Token"**

### Step 3: Save Token

Copy the auth token (starts with `sntrys_`):

```
sntrys_abc123def456...
```

**Important**: This is the only time you'll see the token. Save it securely!

Add to Vercel environment variables as `SENTRY_AUTH_TOKEN` (mark as **Secret**).

---

## 6. Sentry Configuration Files

Daily Baker includes three Sentry configuration files:

### `sentry.client.config.ts` (Browser)

Configured with:
- **Session Replay**: Records user sessions (10% sample rate in production)
- **Error filtering**: Filters out common browser errors (network failures, extensions)
- **Replay on error**: 100% of sessions with errors get recorded
- **Masked content**: All text and media masked for privacy

### `sentry.server.config.ts` (Node.js Runtime)

Configured with:
- **Server-side error tracking**: Catches API route errors
- **Performance monitoring**: Tracks slow database queries
- **Error filtering**: Filters expected errors (validation, connection errors)

### `sentry.edge.config.ts` (Edge Runtime)

Configured for:
- **Edge middleware**: Proxy (authentication) errors
- **Edge API routes**: If you use edge runtime

### `next.config.ts`

Sentry integration enabled via `withSentryConfig`:
- **Source map upload**: Automatic in production
- **Tree-shaking**: Removes Sentry logs in production
- **Vercel Cron monitoring**: Tracks scheduled jobs

---

## 7. Test Error Tracking

### Local Testing

Create a test error in your app:

**src/app/test-error/page.tsx**:
```typescript
'use client';

export default function TestErrorPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test Sentry Error Tracking</h1>

      <button
        className="btn btn-error"
        onClick={() => {
          throw new Error('Test error from client component');
        }}
      >
        Throw Client Error
      </button>

      <button
        className="btn btn-warning ml-4"
        onClick={async () => {
          const res = await fetch('/api/test-error');
          console.log(await res.json());
        }}
      >
        Throw Server Error
      </button>
    </div>
  );
}
```

**src/app/api/test-error/route.ts**:
```typescript
import { NextResponse } from 'next/server';

export async function GET() {
  throw new Error('Test error from API route');
  return NextResponse.json({ message: 'This will never execute' });
}
```

### Testing Flow

1. Start dev server: `npm run dev`
2. Navigate to http://localhost:3000/test-error
3. Click **"Throw Client Error"**
   - **Expected**: Error thrown, but NOT sent to Sentry (development mode)
   - Check browser console: You'll see the error
4. Click **"Throw Server Error"**
   - **Expected**: Error thrown, but NOT sent to Sentry (development mode)
   - Check terminal: You'll see the error

**Note**: Errors are NOT sent to Sentry in development (see `beforeSend` filter in config files).

### Production Testing

After deploying to Vercel:

1. Navigate to https://your-domain.com/test-error
2. Click **"Throw Client Error"**
   - Error IS sent to Sentry
   - Check Sentry Dashboard → **Issues** → You'll see the error
3. Click **"Throw Server Error"**
   - Error IS sent to Sentry
   - Check Sentry Dashboard → **Issues**

**Remember to delete the test-error page** after confirming Sentry works!

---

## 8. Viewing Errors in Sentry

### Sentry Dashboard

1. Go to Sentry Dashboard: https://sentry.io
2. Select your organization → `daily-baker` project
3. Navigate to **Issues**

### Error Details

For each error, Sentry shows:
- **Error message** and stack trace
- **User info**: User ID, email (if authenticated)
- **Browser/device**: OS, browser version
- **URL** and query params
- **Breadcrumbs**: User actions leading to error
- **Source code**: Original TypeScript (via source maps)
- **Session replay**: Video of user session (if available)
- **Release version**: Git commit SHA
- **Environment**: production, preview, development

### Filtering Errors

Use filters to find specific issues:
- **Status**: Unresolved, Resolved, Ignored
- **Level**: Error, Warning, Info
- **Environment**: production, preview
- **Release**: Specific deployment
- **User**: Specific user ID or email

---

## 9. Performance Monitoring

### Enable Performance Monitoring

Already configured via `tracesSampleRate: 0.1` (10% of transactions in production).

### View Performance Data

1. Sentry Dashboard → **Performance**
2. View metrics:
   - **Web Vitals**: LCP, FID, CLS
   - **Slow API routes**: Identify bottlenecks
   - **Database queries**: Track Prisma performance
   - **Page load times**: Understand user experience

### Increase Sample Rate (Optional)

Edit Sentry config files to increase sampling:

```typescript
// sentry.client.config.ts or sentry.server.config.ts
tracesSampleRate: 0.5,  // 50% of transactions
```

**Note**: Higher sample rates increase Sentry quota usage.

---

## 10. Session Replay

### How It Works

Session Replay records:
- **DOM snapshots**: Visual representation of page
- **User interactions**: Clicks, scrolls, inputs
- **Network requests**: API calls and responses
- **Console logs**: JavaScript console output
- **Errors**: When they occur

**Privacy**:
- All text is masked by default (`maskAllText: true`)
- All media is blocked (`blockAllMedia: true`)
- Sensitive data is never recorded

### Viewing Replays

1. Sentry Dashboard → **Issues** → Click an error
2. **Replays** tab → Watch the session video
3. See user actions leading up to the error

### Adjust Replay Settings

Edit `sentry.client.config.ts`:

```typescript
replaysOnErrorSampleRate: 1.0,  // 100% of sessions with errors
replaysSessionSampleRate: 0.1,  // 10% of all sessions (no errors)
```

---

## 11. Alerts and Notifications

### Set Up Alerts

1. Sentry Dashboard → **Alerts** → **Create Alert**
2. **Alert type**:
   - **Issues**: Notify on new/regressed issues
   - **Metric**: Notify on error spikes, slow performance
3. **Conditions**: Define when to alert
   - **New issue** created
   - **Issue seen by > 100 users**
   - **Error rate > 5% for 5 minutes**
4. **Actions**:
   - Email
   - Slack integration
   - PagerDuty (for critical errors)

### Recommended Alerts

**1. New High-Severity Issues**
- Condition: New issue with level = error
- Action: Email to team
- Frequency: Immediately

**2. Error Rate Spike**
- Condition: Error count > 50 in 1 hour
- Action: Slack notification
- Frequency: Every 1 hour (max)

**3. Performance Degradation**
- Condition: P95 response time > 2 seconds for 10 minutes
- Action: Email to on-call engineer
- Frequency: Every deployment

---

## 12. Release Tracking

### Automatic Release Tracking

Sentry automatically tracks releases via Vercel's `VERCEL_GIT_COMMIT_SHA` environment variable.

Each deployment creates a new release:
- **Release ID**: Git commit SHA (e.g., `abc123def456`)
- **Environment**: production, preview
- **Timestamp**: Deployment time

### View Releases

1. Sentry Dashboard → **Releases**
2. See:
   - Errors per release
   - New errors introduced
   - Performance regressions
   - User adoption (% of users on each release)

### Compare Releases

1. Click on a release
2. **Issues** tab → See errors in this release
3. **Commits** tab → See code changes
4. **Compare to previous release**

---

## 13. Source Maps

### What Are Source Maps?

Source maps allow Sentry to show original TypeScript code in error stack traces (instead of minified JavaScript).

### Automatic Upload

Source maps are automatically uploaded to Sentry during Vercel builds via `withSentryConfig` in `next.config.ts`.

**Requirements**:
- `SENTRY_AUTH_TOKEN` set in Vercel environment variables
- `SENTRY_ORG` and `SENTRY_PROJECT` configured
- Production build (`npm run build`)

### Verify Source Maps

After deployment:

1. Trigger an error in production
2. Go to Sentry Dashboard → **Issues** → Click the error
3. Check stack trace:
   - ✅ **With source maps**: Shows TypeScript file and line number
   - ❌ **Without source maps**: Shows minified `.next/...` paths

### Troubleshooting Source Maps

**Error: "No source map found"**

Causes:
- `SENTRY_AUTH_TOKEN` not set
- `SENTRY_ORG` or `SENTRY_PROJECT` incorrect
- Build failed during source map upload

Fix:
1. Check Vercel build logs for Sentry upload errors
2. Verify environment variables in Vercel
3. Regenerate `SENTRY_AUTH_TOKEN` if needed

---

## 14. User Context

### Automatically Captured

Sentry automatically captures:
- **User ID**: From Clerk authentication (via `clerkId`)
- **IP address**: User's IP (hashed for privacy)
- **User agent**: Browser and OS info

### Add Custom User Context

To enrich error reports with user info:

**src/lib/sentry.ts** (create this file):
```typescript
import * as Sentry from '@sentry/nextjs';
import type { User } from '@prisma/client';

/**
 * Set user context for Sentry error tracking
 */
export function setSentryUser(user: User | null) {
  if (user) {
    Sentry.setUser({
      id: user.clerkId,
      email: user.email,
      username: user.name || undefined,
      bakeryId: user.bakeryId || undefined,
      isPlatformAdmin: user.isPlatformAdmin,
    });
  } else {
    Sentry.setUser(null);
  }
}
```

**Use in your app**:
```typescript
import { getCurrentUser } from '@/lib/clerk';
import { setSentryUser } from '@/lib/sentry';

// In server component or API route
const user = await getCurrentUser();
setSentryUser(user);
```

---

## 15. Custom Context and Tags

### Add Tags

Tags help filter and group errors:

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.setTag('bakeryId', user.bakeryId);
Sentry.setTag('feature', 'inventory');
Sentry.setTag('payment_status', 'paid');
```

### Add Context

Extra data for debugging:

```typescript
Sentry.setContext('bakery', {
  id: bakery.id,
  name: bakery.name,
  plan: bakery.subscriptionPlan,
});

Sentry.setContext('recipe', {
  id: recipe.id,
  name: recipe.name,
  ingredients: recipe.ingredients.length,
});
```

### Breadcrumbs

Manual breadcrumbs for tracking user flow:

```typescript
Sentry.addBreadcrumb({
  category: 'inventory',
  message: 'User updated ingredient quantity',
  level: 'info',
  data: {
    ingredientId: ingredient.id,
    oldQuantity: 50,
    newQuantity: 100,
  },
});
```

---

## 16. Ignoring Errors

### In Configuration

Already configured to ignore common errors:
- Network errors (`Failed to fetch`)
- Browser extension errors (`chrome-extension://`)
- ResizeObserver errors (common false positive)

### Add More Filters

Edit `beforeSend` in `sentry.client.config.ts`:

```typescript
beforeSend(event, hint) {
  const error = hint.originalException;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = error.message as string;

    // Add your custom filters
    if (message.includes('Ignore this error')) return null;
  }

  return event;
}
```

### Ignore Specific Errors

In Sentry Dashboard:
1. Go to **Issues** → Click an error
2. **Actions** dropdown → **Ignore**
3. Choose:
   - Ignore indefinitely
   - Ignore until next release
   - Ignore for X days

---

## 17. Integrations

### Slack Integration

1. Sentry Dashboard → **Settings** → **Integrations**
2. Find **Slack** → Click **Install**
3. Authorize Sentry for your Slack workspace
4. Choose Slack channel for notifications
5. Configure:
   - Alert on new issues
   - Alert on resolved issues
   - Daily error summary

### GitHub Integration

1. Sentry Dashboard → **Settings** → **Integrations**
2. Find **GitHub** → Click **Install**
3. Authorize Sentry for your GitHub account
4. Select repository: `dailygrains/daily-baker`
5. Features:
   - **Create issues**: Auto-create GitHub issues from Sentry errors
   - **Link commits**: See which commits introduced errors
   - **Resolve on deploy**: Auto-resolve issues when fixed code is deployed

### Vercel Integration

Already configured automatically via environment variables.

Features:
- **Release tracking**: Automatic via `VERCEL_GIT_COMMIT_SHA`
- **Source maps**: Uploaded during build
- **Environment tags**: `production`, `preview`

---

## 18. Cost Management

### Sentry Pricing Tiers

**Developer (Free)**:
- 5,000 errors per month
- 500 replays per month
- 30-day data retention
- 1 user
- Community support

**Team ($26/month)**:
- 50,000 errors per month
- 1,000 replays per month
- 90-day data retention
- Unlimited users
- Email support

**Business (Custom)**:
- Custom error quota
- Custom replay quota
- 1-year data retention
- SLA and dedicated support

### Daily Baker Expected Usage (Free Tier)

**Errors**:
- Average: 100 errors/day = ~3,000/month
- **Verdict**: Free tier sufficient

**Replays**:
- 10% sample rate + 100% on errors
- Estimate: 200 replays/month
- **Verdict**: Free tier sufficient

### Cost Optimization

1. **Reduce sample rates** in production:
   ```typescript
   tracesSampleRate: 0.05,  // 5% instead of 10%
   replaysSessionSampleRate: 0.05,  // 5% instead of 10%
   ```

2. **Ignore noisy errors** via `beforeSend` filters

3. **Delete old issues** to free up quota

4. **Use error grouping** to reduce duplicate issues

---

## 19. Troubleshooting

### No Errors Appearing in Sentry

**Causes**:
- `NEXT_PUBLIC_SENTRY_DSN` not set or incorrect
- Errors filtered out by `beforeSend`
- Running in development mode (errors not sent)

**Fix**:
1. Verify `NEXT_PUBLIC_SENTRY_DSN` in environment variables
2. Check `beforeSend` filter in config files
3. Test in production or preview deployment

### Source Maps Not Working

**Causes**:
- `SENTRY_AUTH_TOKEN` missing or invalid
- `SENTRY_ORG` or `SENTRY_PROJECT` incorrect
- Source map upload failed during build

**Fix**:
1. Check Vercel build logs for upload errors
2. Regenerate auth token in Sentry
3. Verify org and project names match Sentry exactly

### Session Replay Not Recording

**Causes**:
- Replay not configured in `sentry.client.config.ts`
- Sample rate too low
- User didn't trigger an error (if using `replaysOnErrorSampleRate`)

**Fix**:
1. Check replay configuration
2. Increase `replaysSessionSampleRate` temporarily
3. Trigger an error to force replay

### Too Many Errors Being Sent

**Causes**:
- Noisy errors not filtered
- Production traffic higher than expected
- Error loop (error triggers more errors)

**Fix**:
1. Add more filters to `beforeSend`
2. Identify and fix error loops
3. Reduce sample rates
4. Upgrade Sentry plan if needed

---

## 20. Resources

### Documentation

- [Sentry Docs](https://docs.sentry.io/)
- [Next.js Integration Guide](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Source Maps Guide](https://docs.sentry.io/platforms/javascript/sourcemaps/)
- [Session Replay](https://docs.sentry.io/product/session-replay/)

### Tools

- [Sentry CLI](https://docs.sentry.io/cli/)
- [Sentry Wizard](https://docs.sentry.io/platforms/javascript/guides/nextjs/#install)
- [Sentry GitHub Integration](https://docs.sentry.io/product/integrations/source-code-mgmt/github/)

### Support

- [Sentry Community Forum](https://forum.sentry.io/)
- [Sentry Discord](https://discord.gg/sentry)
- [Sentry Status Page](https://status.sentry.io/)

---

## 21. Next Steps

After Sentry is configured:

1. ✅ Sentry account created
2. ✅ Project configured with DSN
3. ✅ Environment variables set (local and Vercel)
4. ✅ Auth token generated for source maps
5. ✅ Configuration files in place
6. ⏳ Deploy to Vercel and test error tracking
7. ⏳ Set up Slack alerts
8. ⏳ Configure GitHub integration
9. ⏳ Monitor errors and performance
10. ⏳ Remove test-error page after testing

**Your error tracking is now live and monitoring Daily Baker in production!**

**Production Checklist**:
- [ ] All environment variables set in Vercel
- [ ] Auth token configured for source map uploads
- [ ] Test error sent and visible in Sentry Dashboard
- [ ] Source maps working (stack traces show TypeScript)
- [ ] Session replay enabled and working
- [ ] Slack alerts configured
- [ ] Error filters tuned to reduce noise
- [ ] Monitoring quota usage to stay within free tier
