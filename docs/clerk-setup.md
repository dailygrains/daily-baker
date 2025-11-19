# Clerk Authentication Setup Guide

This guide walks you through setting up Clerk authentication for Daily Baker.

## Prerequisites

- Clerk account (free tier available)
- Daily Baker repository cloned
- Node.js and npm installed

---

## 1. Create Clerk Application

### Step 1: Sign Up for Clerk

1. Go to https://clerk.com
2. Click "Start building for free"
3. Sign up with GitHub, Google, or email

### Step 2: Create New Application

1. After signing in, click "Create application"
2. Application name: **Daily Baker**
3. Select authentication methods:
   - ✅ **Email**
   - ✅ **Google** (OAuth)
   - ✅ **GitHub** (OAuth)
4. Click "Create application"

---

## 2. Configure OAuth Providers

### Google OAuth Setup

1. In Clerk Dashboard → **SSO Connections** → **Google**
2. Click "Enable"
3. Follow the Clerk wizard to create Google OAuth credentials:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create new project or select existing
   - Enable Google+ API
   - Create OAuth 2.0 Client ID
   - Add authorized redirect URI from Clerk
   - Copy Client ID and Client Secret to Clerk

### GitHub OAuth Setup

1. In Clerk Dashboard → **SSO Connections** → **GitHub**
2. Click "Enable"
3. Follow the Clerk wizard:
   - Go to [GitHub Developer Settings](https://github.com/settings/developers)
   - Create New OAuth App
   - Add callback URL from Clerk
   - Copy Client ID and Client Secret to Clerk

---

## 3. Get API Keys

### Step 1: Navigate to API Keys

1. In Clerk Dashboard, click on your application
2. Go to **API Keys** in the sidebar

### Step 2: Copy Keys

You'll need two keys:

1. **Publishable Key** (starts with `pk_test_` or `pk_live_`)
   - Safe to expose in client-side code
   - Used in `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`

2. **Secret Key** (starts with `sk_test_` or `sk_live_`)
   - **Keep secret!** Never commit to git
   - Used in `CLERK_SECRET_KEY`

---

## 4. Configure Environment Variables

### Local Development

1. Open `.env` file in project root
2. Add your Clerk keys:

```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

3. **Important**: Never commit `.env` to git!

### Production (Vercel)

1. Go to your Vercel project settings
2. Navigate to **Environment Variables**
3. Add the same variables:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` = your production publishable key
   - `CLERK_SECRET_KEY` = your production secret key (mark as **Secret**)
4. Apply to: Production, Preview, and Development

---

## 5. Configure Domains

### Development

Clerk automatically allows `localhost:3000` for development.

### Production

1. In Clerk Dashboard → **Domains**
2. Add your production domain (e.g., `daily-baker.vercel.app`)
3. Verify domain ownership if required
4. Update redirect URLs:
   - Sign in redirect: `https://yourdomain.com/dashboard`
   - Sign up redirect: `https://yourdomain.com/dashboard`

---

## 6. Customize Authentication

### Branding

1. In Clerk Dashboard → **Customization** → **Branding**
2. Upload logo
3. Set brand colors (match DaisyUI theme)
4. Update application name: "Daily Baker"

### Sign-Up/Sign-In Experience

1. **Customization** → **Email & Phone**
   - Require email verification: ✅ Recommended
   - Allow password: ✅ Enabled
   - Password requirements: Set minimum strength

2. **User & Authentication** → **Email, Phone, Username**
   - Email: ✅ Required
   - Phone: ❌ Optional
   - Username: ❌ Not needed for bakery app

3. **User & Authentication** → **Social Connections**
   - Google: ✅ Enabled
   - GitHub: ✅ Enabled
   - Configure additional providers as needed

---

## 7. Signup Restrictions (Optional)

### Public Mode (Default - Recommended for Internal Tool)

- Open signups allowed
- Anyone can create an account
- You'll manually assign users to bakeries after signup

### Restricted Mode

1. Go to **User & Authentication** → **Restrictions**
2. Enable **Block sign-ups**
3. Use when you want to temporarily stop new registrations

### Allowlist Mode (Paid Plans Only)

1. **Restrictions** → **Allowlist**
2. Add allowed email domains or specific emails
3. Only users on allowlist can sign up

---

## 8. Test Authentication Flow

### Local Testing

1. Start dev server: `npm run dev`
2. Navigate to http://localhost:3000
3. Click "Sign In" or "Sign Up"
4. Test authentication methods:
   - Email/password signup
   - Google OAuth
   - GitHub OAuth
5. Verify redirect to `/dashboard` after authentication
6. Check that user record is created in database

### Verify Database Sync

```bash
# Open Prisma Studio
npm run db:studio

# Check Users table
# You should see new user with:
# - clerkId from Clerk
# - email
# - name
# - lastLoginAt
```

---

## 9. Configure Webhooks (User Sync)

Webhooks keep your database in sync with Clerk events.

### Step 1: Create Webhook Endpoint

1. In Clerk Dashboard → **Webhooks**
2. Click "Add Endpoint"
3. Endpoint URL:
   - Development: Use ngrok or similar tunnel
   - Production: `https://yourdomain.com/api/webhooks/clerk`

### Step 2: Select Events

Enable these events:
- ✅ `user.created` - Sync new users
- ✅ `user.updated` - Sync profile updates
- ✅ `user.deleted` - Handle user deletions

### Step 3: Get Signing Secret

1. Copy the **Signing Secret** (starts with `whsec_`)
2. Add to environment variables:

```bash
CLERK_WEBHOOK_SECRET=whsec_xxxxx
```

### Step 4: Create Webhook Handler (Future)

This will be implemented in a later issue. The webhook will:
- Automatically create/update users in database
- Sync email and name changes
- Handle soft-delete for removed users

---

## 10. Session Management

### Session Duration

1. In Clerk Dashboard → **Sessions**
2. Configure:
   - Session lifetime: 7 days (default)
   - Inactive session lifetime: 24 hours
   - Multi-session handling: Allow (users can be logged in on multiple devices)

### Sign Out

Users can sign out from:
- Clerk's `<UserButton />` component
- Custom sign-out buttons in your app

---

## 11. User Profile Management

Clerk provides built-in user profile pages:

- Access via `<UserButton />` component
- Users can update:
  - Name
  - Email (requires verification)
  - Password
  - Connected accounts (OAuth)
  - Profile image

---

## 12. Platform Admin Setup

### Promote First User to Platform Admin

After first user signs up:

```sql
-- Connect to database
psql -d daily_baker

-- Find user by email
SELECT id, email, "isPlatformAdmin" FROM users WHERE email = 'your.email@example.com';

-- Promote to platform admin
UPDATE users SET "isPlatformAdmin" = true WHERE email = 'your.email@example.com';
```

Or use Prisma Studio:
1. Run `npm run db:studio`
2. Open Users table
3. Find your user
4. Set `isPlatformAdmin` to `true`
5. Save

---

## 13. Security Best Practices

### API Key Security

- ✅ Use test keys for development
- ✅ Use production keys for production
- ❌ Never commit keys to git
- ❌ Never expose secret key in client code
- ✅ Rotate keys if exposed

### Environment Variables

```bash
# .env (local - never commit)
CLERK_SECRET_KEY=sk_test_xxxxx

# .env.example (committed - safe)
CLERK_SECRET_KEY=sk_test_xxxxx_replace_with_your_key
```

### Production Checklist

- [ ] Switch from test keys to production keys
- [ ] Configure production domain in Clerk
- [ ] Enable email verification
- [ ] Set up webhook endpoint with HTTPS
- [ ] Configure session timeouts
- [ ] Review and restrict signup if needed

---

## 14. Troubleshooting

### "Invalid publishable key" Error

**Cause**: Wrong or missing `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`

**Fix**:
1. Check `.env` file exists
2. Verify key starts with `pk_test_` or `pk_live_`
3. Restart dev server after changing .env

### "Authentication required" on Public Pages

**Cause**: Proxy protecting all routes

**Fix**: Check `src/proxy.ts` - public routes should include:
```typescript
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
]);
```

**Note**: Next.js 16 renamed `middleware.ts` to `proxy.ts`

### OAuth Redirect URI Mismatch

**Cause**: Redirect URI not configured in OAuth provider

**Fix**:
1. Get exact redirect URI from Clerk dashboard
2. Add to Google/GitHub OAuth app settings
3. URI format: `https://your-clerk-domain.clerk.accounts.dev/v1/oauth_callback`

### User Not Created in Database

**Cause**: Database sync not working

**Fix**:
1. Check database connection (DATABASE_URL in .env)
2. Verify Prisma client generated: `npm run db:generate`
3. Check `src/lib/clerk.ts` `getCurrentUser()` function
4. Review server logs for errors

---

## 15. Resources

### Documentation
- [Clerk Docs](https://clerk.com/docs)
- [Clerk Next.js Quick start](https://clerk.com/docs/quickstarts/nextjs)
- [Clerk AI Prompts](https://clerk.com/docs/guides/development/ai-prompts)

### AI Resources
- [Clerk llms.txt](https://clerk.com/llms.txt)
- [Clerk Agent Toolkit](https://github.com/clerk/javascript/tree/main/packages/agent-toolkit)
- [MCP Integration Guide](https://clerk.com/docs/guides/development/mcp/connect-mcp-client)

### Support
- [Clerk Discord](https://clerk.com/discord)
- [Clerk GitHub Issues](https://github.com/clerk/javascript/issues)

---

## Next Steps

After Clerk is configured:

1. ✅ Authentication working
2. ⏳ Create dashboard layout (Issue #11)
3. ⏳ Implement bakery CRUD (Issue #12)
4. ⏳ Build platform admin features (Issue #13-15)

**Your authentication is now secure and ready for production!**
