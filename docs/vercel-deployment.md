# Vercel Deployment Guide

This guide walks you through deploying Daily Baker to Vercel for production.

## Purpose

Vercel provides:
- **Zero-config deployments** for Next.js applications
- **Automatic HTTPS** with SSL certificates
- **Edge network** (global CDN) for fast page loads
- **Preview deployments** for every git push
- **Environment variable management** for secrets
- **Built-in monitoring** and analytics

---

## Prerequisites

- Vercel account (free tier available)
- Daily Baker repository on GitHub
- PostgreSQL database (production instance)
- AWS S3 bucket configured
- AWS SES configured
- Clerk application configured

---

## 1. Create Vercel Account

### Step 1: Sign Up

1. Go to https://vercel.com
2. Click "Sign Up"
3. **Sign up with GitHub** (recommended for repository access)
4. Authorize Vercel to access your GitHub account

### Step 2: Install Vercel for GitHub

1. After signup, you'll be prompted to install Vercel for GitHub
2. Choose repositories to grant access:
   - **Only select repositories**: Choose `dailygrains/daily-baker`
   - Or **All repositories** (if you want to deploy other projects)
3. Click "Install"

---

## 2. Import Project from GitHub

### Step 1: Create New Project

1. In Vercel Dashboard, click **"Add New..."** → **"Project"**
2. Select **Import Git Repository**
3. Find `dailygrains/daily-baker`
4. Click **"Import"**

### Step 2: Configure Project

**Framework Preset**: Next.js (auto-detected)

**Root Directory**: `.` (default)

**Build Command**: `npm run build` (default)

**Output Directory**: `.next` (default)

**Install Command**: `npm ci` (default)

**Development Command**: `npm run dev` (default)

Click **"Deploy"** to start initial deployment (it will likely fail due to missing environment variables - that's expected!)

---

## 3. Configure Environment Variables

### Step 1: Navigate to Project Settings

1. In Vercel Dashboard → Your project
2. Go to **Settings** → **Environment Variables**

### Step 2: Add All Environment Variables

Add the following variables. For sensitive values, mark them as **Secret** by clicking the eye icon.

#### Database Configuration

| Variable Name | Value | Environment | Secret? |
|--------------|-------|-------------|---------|
| `DATABASE_URL` | `postgresql://user:password@host:5432/dbname?pgbouncer=true` | Production, Preview, Development | ✅ Yes |
| `DIRECT_DATABASE_URL` | `postgresql://user:password@host:5432/dbname` | Production, Preview, Development | ✅ Yes |

**Note**:
- `DATABASE_URL` should use connection pooling (e.g., PgBouncer URL from Neon, Supabase, Railway)
- `DIRECT_DATABASE_URL` is the direct connection (for Prisma migrations)

#### Clerk Authentication

| Variable Name | Value | Environment | Secret? |
|--------------|-------|-------------|---------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_xxxxx` | Production, Preview, Development | ❌ No |
| `CLERK_SECRET_KEY` | `sk_live_xxxxx` | Production, Preview, Development | ✅ Yes |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` | Production, Preview, Development | ❌ No |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` | Production, Preview, Development | ❌ No |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | `/dashboard` | Production, Preview, Development | ❌ No |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | `/dashboard` | Production, Preview, Development | ❌ No |

**Important**: Use **production** keys for production, **test** keys for preview/development!

#### AWS Configuration

| Variable Name | Value | Environment | Secret? |
|--------------|-------|-------------|---------|
| `AWS_REGION` | `us-east-1` | Production, Preview, Development | ❌ No |
| `AWS_ACCESS_KEY_ID` | `AKIAIOSFODNN7EXAMPLE` | Production, Preview, Development | ✅ Yes |
| `AWS_SECRET_ACCESS_KEY` | `wJalrXUtnFEMI/...` | Production, Preview, Development | ✅ Yes |
| `AWS_S3_BUCKET_NAME` | `daily-baker-uploads` | Production, Preview, Development | ❌ No |
| `AWS_SES_FROM_EMAIL` | `noreply@yourdomain.com` | Production, Preview, Development | ✅ Yes |

#### Application Configuration

| Variable Name | Value | Environment | Secret? |
|--------------|-------|-------------|---------|
| `NEXT_PUBLIC_APP_URL` | `https://daily-baker.vercel.app` | Production | ❌ No |
| `NEXT_PUBLIC_APP_URL` | `https://your-preview.vercel.app` | Preview | ❌ No |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Development | ❌ No |
| `NODE_ENV` | `production` | Production | ❌ No |

**Note**: `NEXT_PUBLIC_APP_URL` should be your actual production domain once configured.

### Step 3: Save and Redeploy

1. After adding all variables, click **"Save"**
2. Go to **Deployments** tab
3. Find the failed deployment
4. Click **"..."** → **"Redeploy"**
5. Monitor build logs for success

---

## 4. Configure Custom Domain (Optional)

### Step 1: Add Domain

1. Project Settings → **Domains**
2. Click **"Add"**
3. Enter your domain (e.g., `daily-baker.com`)
4. Click **"Add"**

### Step 2: Configure DNS

Vercel will provide DNS records to add:

**Option A: Use Vercel Nameservers** (Recommended)
1. Copy the nameservers Vercel provides
2. Go to your domain registrar (Namecheap, GoDaddy, etc.)
3. Update nameservers to Vercel's
4. Wait for DNS propagation (5 minutes to 48 hours)

**Option B: CNAME Record**
1. Add CNAME record:
   - Name: `www` (or `@` for root domain)
   - Value: `cname.vercel-dns.com`
2. Add A record for root domain:
   - Name: `@`
   - Value: `76.76.21.21`

### Step 3: Verify Domain

1. Wait for DNS propagation
2. Vercel automatically provisions SSL certificate
3. Domain shows "Valid" status in Vercel Dashboard
4. Update `NEXT_PUBLIC_APP_URL` environment variable to your custom domain

### Step 4: Update Clerk Allowed Domains

1. Go to Clerk Dashboard → **Domains**
2. Add your production domain (e.g., `daily-baker.com`)
3. Update redirect URLs if needed

### Step 5: Update AWS S3 CORS

Update your S3 bucket CORS policy to include production domain:

```json
{
  "AllowedOrigins": [
    "http://localhost:3000",
    "https://daily-baker.vercel.app",
    "https://daily-baker.com",
    "https://*.vercel.app"
  ]
}
```

---

## 5. Database Migrations

### Initial Migration

After first successful deployment:

```bash
# From your local machine, with DIRECT_DATABASE_URL pointing to production database
npm run db:push

# Or if you have migrations:
npm run db:migrate
```

**Warning**: This is destructive! Only run on a fresh production database.

### Future Migrations

For ongoing schema changes:

**Option A: Run migrations locally**
```bash
# Ensure DIRECT_DATABASE_URL in .env points to production database
npm run db:migrate

# Redeploy to Vercel
git push origin main
```

**Option B: Automated migrations on deployment**

Add to `package.json`:
```json
{
  "scripts": {
    "vercel-build": "prisma generate && prisma migrate deploy && next build"
  }
}
```

Update `vercel.json`:
```json
{
  "buildCommand": "npm run vercel-build"
}
```

**Security Note**: Automated migrations in production can be risky. Consider running migrations manually.

---

## 6. Preview Deployments

### How Preview Deployments Work

- **Every push to any branch** creates a preview deployment
- **Every pull request** gets a unique preview URL
- **Independent environment** from production
- **Same environment variables** (from "Preview" scope)

### Preview URLs

Format: `https://daily-baker-{branch}-{team}.vercel.app`

Example: `https://daily-baker-feature-recipes-dailygrains.vercel.app`

### Using Preview Deployments

1. Create a feature branch:
   ```bash
   git checkout -b feature/new-recipe-ui
   ```

2. Make changes and push:
   ```bash
   git add .
   git commit -m "Add new recipe UI"
   git push origin feature/new-recipe-ui
   ```

3. Vercel automatically deploys:
   - Check Vercel Dashboard → **Deployments**
   - Find your preview URL
   - Test changes before merging

4. Create pull request on GitHub:
   - Vercel comments on PR with preview link
   - Team can review live preview
   - Merge when ready → auto-deploys to production

---

## 7. Production Deployment Workflow

### Automatic Deployments

Vercel automatically deploys on:
- **Push to `main` branch** → Production deployment
- **Push to any branch** → Preview deployment
- **Pull request opened** → Preview deployment

### Manual Deployments

If you need to deploy without pushing:

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod

# Deploy to preview
vercel
```

### Deployment Process

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Add new feature"
   git push origin main
   ```

2. **Vercel automatically**:
   - Clones repository
   - Installs dependencies (`npm ci`)
   - Generates Prisma Client
   - Builds Next.js (`npm run build`)
   - Deploys to edge network
   - Provisions SSL certificate
   - Invalidates CDN cache

3. **Monitor deployment**:
   - Vercel Dashboard → **Deployments**
   - View build logs
   - Check for errors
   - Verify deployment URL

---

## 8. Environment-Specific Configurations

### Production vs. Preview vs. Development

Vercel allows different values per environment:

**Example: Database URLs**

| Environment | DATABASE_URL |
|------------|--------------|
| Production | Production PostgreSQL instance |
| Preview | Staging PostgreSQL instance (optional) |
| Development | Local PostgreSQL (`localhost:5432`) |

**Example: Clerk Keys**

| Environment | CLERK_SECRET_KEY |
|------------|------------------|
| Production | `sk_live_xxxxx` |
| Preview | `sk_test_xxxxx` |
| Development | `sk_test_xxxxx` |

### Accessing Environment Variables in Code

```typescript
// Always available
process.env.NEXT_PUBLIC_APP_URL

// Server-side only
process.env.DATABASE_URL
process.env.CLERK_SECRET_KEY
```

**Important**: Only variables prefixed with `NEXT_PUBLIC_` are accessible in browser code!

---

## 9. Monitoring and Logs

### Deployment Logs

1. Vercel Dashboard → **Deployments**
2. Click on a deployment
3. View **Building** and **Function Logs** tabs
4. Search logs for errors

### Function Logs (Runtime)

1. Click on a deployment
2. **Functions** tab
3. View real-time logs for API routes and server components
4. Filter by function path

### Vercel Analytics (Optional)

Enable analytics for insights:

1. Project Settings → **Analytics**
2. Enable **Web Analytics** (free)
3. View metrics:
   - Page views
   - Unique visitors
   - Top pages
   - Real-time traffic

### Speed Insights (Optional)

Track Core Web Vitals:

1. Install package:
   ```bash
   npm install @vercel/speed-insights
   ```

2. Add to `layout.tsx`:
   ```typescript
   import { SpeedInsights } from '@vercel/speed-insights/next';

   export default function RootLayout({ children }) {
     return (
       <html>
         <body>
           {children}
           <SpeedInsights />
         </body>
       </html>
     );
   }
   ```

3. View metrics in Vercel Dashboard → **Speed Insights**

---

## 10. Rollback Strategy

### Rolling Back a Deployment

If a deployment has issues:

1. Vercel Dashboard → **Deployments**
2. Find the last known good deployment
3. Click **"..."** → **"Promote to Production"**
4. Confirm → instant rollback

**Note**: This doesn't revert database changes! Plan migrations carefully.

### Git-Based Rollback

```bash
# Find the commit hash of last known good state
git log --oneline

# Revert to that commit
git revert HEAD~1  # Revert last commit
# Or
git reset --hard abc123  # Hard reset to specific commit
git push origin main --force  # Force push (use with caution!)
```

---

## 11. Build Optimization

### Reducing Build Time

**1. Use `npm ci` instead of `npm install`**
Already configured in `vercel.json`:
```json
{
  "installCommand": "npm ci"
}
```

**2. Cache node_modules**
Vercel automatically caches dependencies between builds.

**3. Optimize images**
Use Next.js `<Image>` component for automatic optimization:
```typescript
import Image from 'next/image';

<Image
  src="/logo.png"
  width={200}
  height={100}
  alt="Logo"
  priority
/>
```

**4. Enable SWC minification**
Already enabled by default in Next.js 16.

**5. Reduce bundle size**
```bash
# Analyze bundle
npm run build
# Check output for large modules
```

---

## 12. Security Considerations

### Environment Variables

- ✅ Mark all secrets as **Secret** in Vercel
- ✅ Use different keys for production vs. preview
- ✅ Rotate credentials regularly
- ❌ Never commit secrets to git
- ❌ Never use production credentials in preview

### Headers

Security headers already configured in `vercel.json`:
- `X-Content-Type-Options: nosniff` - Prevent MIME sniffing
- `X-Frame-Options: DENY` - Prevent clickjacking
- `X-XSS-Protection: 1; mode=block` - XSS protection
- `Referrer-Policy: strict-origin-when-cross-origin` - Referrer control
- `Permissions-Policy` - Disable unnecessary browser features

### Database Security

- ✅ Use connection pooling for `DATABASE_URL`
- ✅ Use SSL for database connections
- ✅ Restrict database access to Vercel IPs (if possible)
- ✅ Use strong database passwords
- ❌ Don't expose `DIRECT_DATABASE_URL` to serverless functions

### Clerk Security

- ✅ Enable email verification in Clerk
- ✅ Configure allowed domains in Clerk Dashboard
- ✅ Use HTTPS redirect URLs only
- ✅ Monitor authentication logs in Clerk

---

## 13. Troubleshooting

### Build Failed: "Cannot find module"

**Cause**: Dependency not in `package.json` or cache issue

**Fix**:
1. Check `package.json` includes all dependencies
2. Vercel Dashboard → Settings → **Clear Cache**
3. Redeploy

### Build Failed: "Prisma Client not generated"

**Cause**: Prisma generation not running during build

**Fix**:
Add postinstall script to `package.json`:
```json
{
  "scripts": {
    "postinstall": "prisma generate"
  }
}
```

### Runtime Error: "DATABASE_URL is not defined"

**Cause**: Environment variable not set or not accessible

**Fix**:
1. Verify variable is set in Vercel Dashboard
2. Check it's applied to correct environment (Production/Preview)
3. Redeploy after adding variable

### CORS Error with S3 Uploads

**Cause**: S3 CORS policy doesn't include Vercel domain

**Fix**:
Update S3 CORS configuration to include:
```json
{
  "AllowedOrigins": [
    "https://daily-baker.vercel.app",
    "https://*.vercel.app"
  ]
}
```

### Function Timeout Error

**Cause**: Function exceeds 10-second limit (Hobby plan)

**Fix**:
1. Optimize slow queries or API calls
2. Upgrade to Pro plan (60-second limit)
3. Move long-running tasks to background jobs

### Deployment Stuck at "Building"

**Cause**: Build process hanging or infinite loop

**Fix**:
1. Click **"Cancel Deployment"**
2. Check build logs for errors
3. Test build locally: `npm run build`
4. Fix errors and redeploy

### Preview Deployment Using Wrong Environment Variables

**Cause**: Variables only set for "Production" scope

**Fix**:
1. Settings → Environment Variables
2. Ensure variables have **"Preview"** scope enabled
3. Redeploy preview

---

## 14. Cost Management

### Vercel Pricing Tiers

**Hobby (Free)**:
- Unlimited deployments
- 100 GB bandwidth per month
- 100 GB-hours serverless function execution
- 6,000 build minutes per month
- 1 concurrent build
- Community support

**Pro ($20/month per user)**:
- 1 TB bandwidth per month
- 1,000 GB-hours serverless function execution
- 24,000 build minutes per month
- 3 concurrent builds
- Email support
- Password protection for previews
- Advanced analytics

**Enterprise (Custom pricing)**:
- Custom bandwidth and function execution
- Dedicated support
- SSO/SAML authentication
- Enterprise SLA

### Daily Baker Expected Usage (Free Tier)

**Bandwidth**:
- Average page: ~500 KB
- 100 GB / 500 KB = ~200,000 page views per month
- **Verdict**: Free tier sufficient for small-medium bakeries

**Function Execution**:
- Average request: ~50 ms
- 100 GB-hours = 100 × 3,600 = 360,000 seconds
- 360,000 / 0.05 = ~7,200,000 requests per month
- **Verdict**: Free tier sufficient

**Builds**:
- ~10 deployments per day = ~300 per month
- Each build: ~3 minutes
- Total: 900 build minutes
- **Verdict**: Free tier sufficient (6,000 limit)

### Cost Optimization

1. **Optimize images** - Reduce bandwidth
2. **Cache static assets** - Reduce function invocations
3. **Minimize API calls** - Batch requests where possible
4. **Use ISR** (Incremental Static Regeneration) for semi-static pages

---

## 15. CI/CD Integration

### GitHub Actions (Optional)

For additional checks before deployment:

**.github/workflows/ci.yml**:
```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint
      - run: npm run build
      - run: npm test  # If you have tests
```

This runs before Vercel deployment to catch errors early.

---

## 16. Resources

### Documentation

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [Vercel CLI Reference](https://vercel.com/docs/cli)
- [Environment Variables Guide](https://vercel.com/docs/environment-variables)

### Tools

- [Vercel CLI](https://vercel.com/docs/cli)
- [Vercel for GitHub](https://vercel.com/docs/git/vercel-for-github)
- [Vercel Analytics](https://vercel.com/analytics)
- [Speed Insights](https://vercel.com/docs/speed-insights)

### Support

- [Vercel Community](https://github.com/vercel/vercel/discussions)
- [Vercel Discord](https://vercel.com/discord)
- [Status Page](https://vercel-status.com)

---

## 17. Next Steps

After Vercel deployment is configured:

1. ✅ Vercel account created
2. ✅ Project imported from GitHub
3. ✅ Environment variables configured
4. ✅ Custom domain added (optional)
5. ✅ Database migrated to production
6. ⏳ Monitor first production deployment
7. ⏳ Test all features in production
8. ⏳ Set up error tracking with Sentry (Issue #9)
9. ⏳ Create seed data for demo/testing (Issue #10)

**Your Daily Baker application is now live on Vercel!**

**Production Checklist**:
- [ ] All environment variables set correctly
- [ ] Database migrations applied
- [ ] Clerk production keys configured
- [ ] AWS S3 CORS includes production domain
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active
- [ ] Preview deployments working
- [ ] Monitoring enabled
