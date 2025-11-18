# Daily Baker - GitHub Issue Tickets

## How to Use This File

1. Create a new GitHub repository: `daily-baker`
2. Copy each issue section below into a new GitHub issue
3. Apply the suggested labels and milestone
4. Assign to appropriate developer/team

---

## Phase 1: Foundation

### Issue #1: Initialize Next.js 15 Project with TypeScript

**Labels:** `infrastructure`, `phase-1`, `priority:critical`
**Milestone:** Phase 1 - Foundation
**Estimated Effort:** 4 hours
**Dependencies:** None

**Description:**
Initialize the Daily Baker project with Next.js 15, TypeScript, and required dependencies.

**Tasks:**
- [ ] Run `npx create-next-app@latest daily-baker` with TypeScript, ESLint, App Router
- [ ] Configure `tsconfig.json` with strict mode and path aliases (`@/*`)
- [ ] Setup project structure (src directory organization)
- [ ] Install core dependencies:
  - `@prisma/client`, `prisma`
  - `@clerk/nextjs`
  - `tailwindcss`, `daisyui`
  - `@mdxeditor/editor`
  - `zustand`
  - `@tanstack/react-query`
  - `lucide-react`
  - `zod`
- [ ] Configure `next.config.js` with MDX transpilation and webpack settings
- [ ] Setup npm scripts: `dev`, `build`, `lint`, `type-check`
- [ ] Create `.gitignore` (include `.env*` files)
- [ ] Initialize git repository
- [ ] Create `README.md` with setup instructions

**Acceptance Criteria:**
- ✅ `npm run dev` starts development server successfully
- ✅ TypeScript compilation has no errors
- ✅ ESLint passes with no warnings
- ✅ Path aliases work (`@/components/...`)
- ✅ Repository initialized with clean commit history

---

### Issue #2: Configure Tailwind CSS v4 and DaisyUI

**Labels:** `frontend`, `styling`, `phase-1`, `priority:critical`
**Milestone:** Phase 1 - Foundation
**Estimated Effort:** 3 hours
**Dependencies:** #1

**Description:**
Setup Tailwind CSS v4 and DaisyUI component library with theme configuration.

**Tasks:**
- [ ] Install Tailwind CSS v4 and DaisyUI
- [ ] Configure `tailwind.config.ts` with custom theme
- [ ] Setup DaisyUI with light/dark mode support
- [ ] Configure typography settings (Geist Sans, Geist Mono)
- [ ] Create base CSS file with Tailwind directives
- [ ] Test responsive breakpoints (mobile, tablet, desktop)
- [ ] Create sample component to verify setup
- [ ] Document theme customization approach

**Acceptance Criteria:**
- ✅ Tailwind utilities work in components
- ✅ DaisyUI components render correctly
- ✅ Dark/light mode toggles successfully
- ✅ Custom fonts load properly
- ✅ Responsive breakpoints function as expected

**Resources:**
- DaisyUI llms.txt: https://daisyui.com/llms.txt
- Tailwind v4 docs: https://tailwindcss.com/docs

---

### Issue #3: Setup PostgreSQL Database and Prisma ORM

**Labels:** `database`, `infrastructure`, `phase-1`, `priority:critical`
**Milestone:** Phase 1 - Foundation
**Estimated Effort:** 6 hours
**Dependencies:** #1

**Description:**
Configure PostgreSQL database (local + hosted) and setup Prisma ORM with connection pooling.

**Tasks:**
- [ ] Setup local PostgreSQL database (Docker or native)
- [ ] Setup hosted PostgreSQL (Vercel Postgres or Supabase)
- [ ] Install Prisma CLI and client
- [ ] Run `prisma init` to create base schema
- [ ] Configure `DATABASE_URL` in `.env.development`
- [ ] Create `.env.example` template
- [ ] Configure Prisma Accelerate for connection pooling (if using)
- [ ] Create npm scripts:
  - `db:generate` - Generate Prisma Client
  - `db:migrate` - Create and apply migration
  - `db:migrate:reset` - Reset database
  - `db:studio` - Open Prisma Studio
  - `db:seed` - Populate test data
- [ ] Test database connection
- [ ] Document database setup process

**Acceptance Criteria:**
- ✅ Local PostgreSQL running and accessible
- ✅ Prisma can connect to database
- ✅ `prisma generate` creates client successfully
- ✅ Prisma Studio opens and shows database
- ✅ Environment variables properly configured

**Resources:**
- Prisma llms.txt: https://www.prisma.io/llms.txt
- Prisma MCP: https://www.prisma.io/docs/orm/more/ai-tools

---

### Issue #4: Define Multi-Tenant Database Schema

**Labels:** `database`, `schema`, `phase-1`, `priority:critical`
**Milestone:** Phase 1 - Foundation
**Estimated Effort:** 8 hours
**Dependencies:** #3

**Description:**
Create comprehensive Prisma schema for multi-tenant bakery management system.

**Tasks:**
- [ ] Create `Bakery` model (multi-tenant organization)
- [ ] Create `User` model with platform admin flag
- [ ] Create `Role` model (dynamic, bakery-scoped)
- [ ] Create `Recipe` and `RecipeSection` models
- [ ] Create `RecipeSectionIngredient` junction model
- [ ] Create `Ingredient` model with inventory tracking
- [ ] Create `InventoryTransaction` model with enum types
- [ ] Create `Vendor` and `VendorContact` models
- [ ] Create `Equipment` model with status enum
- [ ] Create `BakeSheet` model
- [ ] Create `UnitConversion` model
- [ ] Add proper indexes on:
  - Foreign keys
  - `isPlatformAdmin`
  - `bakeryId` (for data scoping)
  - Frequently queried fields
- [ ] Add unique constraints where needed
- [ ] Document schema relationships

**Acceptance Criteria:**
- ✅ Schema compiles without errors
- ✅ All relationships properly defined
- ✅ Indexes created on critical fields
- ✅ Enums defined for status fields
- ✅ Data isolation enforced at schema level
- ✅ Migration generated successfully

**Reference:**
See specification section "Database Schema Design" for complete models.

---

### Issue #5: Configure Clerk Authentication

**Labels:** `authentication`, `infrastructure`, `phase-1`, `priority:critical`
**Milestone:** Phase 1 - Foundation
**Estimated Effort:** 4 hours
**Dependencies:** #1

**Description:**
Setup Clerk authentication with OAuth providers and email/password support.

**Tasks:**
- [ ] Create Clerk account and application
- [ ] Configure OAuth providers (Google, GitHub)
- [ ] Enable email/password authentication
- [ ] Install `@clerk/nextjs` package
- [ ] Add Clerk environment variables to `.env.development`:
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - `CLERK_SECRET_KEY`
- [ ] Wrap app with `ClerkProvider` in layout
- [ ] Create sign-in/sign-up pages
- [ ] Implement authentication middleware
- [ ] Test sign-up and sign-in flows
- [ ] Configure signup restrictions (optional for MVP)

**Acceptance Criteria:**
- ✅ Users can sign up with email/password
- ✅ OAuth providers work (Google, GitHub)
- ✅ Authentication middleware protects routes
- ✅ User session persists across page reloads
- ✅ Sign-out functionality works

**Resources:**
- Clerk llms.txt: https://clerk.com/llms.txt
- Clerk AI prompts: https://clerk.com/docs/guides/development/ai-prompts

---

### Issue #6: Setup AWS S3 for File Storage

**Labels:** `integration`, `aws`, `phase-1`, `priority:high`
**Milestone:** Phase 1 - Foundation
**Estimated Effort:** 4 hours
**Dependencies:** #1

**Description:**
Configure AWS S3 bucket and SDK for file uploads (MDX editor images/attachments).

**Tasks:**
- [ ] Create AWS account (if needed)
- [ ] Create S3 bucket with appropriate settings
- [ ] Configure bucket CORS policy for Next.js app
- [ ] Setup IAM user with S3 permissions
- [ ] Install AWS SDK packages:
  - `@aws-sdk/client-s3`
  - `@aws-sdk/s3-request-presigner`
- [ ] Create `lib/s3.ts` with S3 client configuration
- [ ] Add AWS environment variables:
  - `AWS_REGION`
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
  - `AWS_S3_BUCKET_NAME`
- [ ] Create presigned URL generation function
- [ ] Test file upload workflow
- [ ] Document S3 setup process

**Acceptance Criteria:**
- ✅ S3 bucket created and accessible
- ✅ IAM credentials work
- ✅ Presigned URLs generate successfully
- ✅ Files upload to S3 bucket
- ✅ CORS configuration allows browser uploads

---

### Issue #7: Setup AWS SES for Email Service

**Labels:** `integration`, `aws`, `email`, `phase-1`, `priority:medium`
**Milestone:** Phase 1 - Foundation
**Estimated Effort:** 3 hours
**Dependencies:** #1

**Description:**
Configure AWS Simple Email Service (SES) for transactional emails.

**Tasks:**
- [ ] Enable AWS SES in appropriate region
- [ ] Verify sender email address
- [ ] Move out of SES sandbox (if applicable)
- [ ] Install `@aws-sdk/client-ses`
- [ ] Create `lib/ses.ts` with SES client configuration
- [ ] Add SES environment variables:
  - `AWS_SES_FROM_EMAIL`
  - `AWS_SES_REGION`
- [ ] Create email template system
- [ ] Create test email sending function
- [ ] Test email delivery
- [ ] Document email templates

**Acceptance Criteria:**
- ✅ SES configured and verified
- ✅ Test emails send successfully
- ✅ Email templates render correctly
- ✅ Error handling for failed sends

---

### Issue #8: Configure Vercel Deployment Pipeline

**Labels:** `devops`, `deployment`, `phase-1`, `priority:high`
**Milestone:** Phase 1 - Foundation
**Estimated Effort:** 3 hours
**Dependencies:** #1, #3, #5

**Description:**
Setup Vercel deployment with staging/production environments and automatic deployments.

**Tasks:**
- [ ] Create Vercel account and project
- [ ] Connect GitHub repository to Vercel
- [ ] Configure production environment variables
- [ ] Configure preview (staging) environment variables
- [ ] Setup custom domain (if available)
- [ ] Configure build settings:
  - Build command: `npm run build`
  - Output directory: `.next`
  - Install command: `npm ci`
- [ ] Enable automatic deployments on push to main
- [ ] Enable preview deployments for pull requests
- [ ] Test deployment pipeline
- [ ] Configure Prisma migration deployment
- [ ] Document deployment process

**Acceptance Criteria:**
- ✅ App deploys to Vercel successfully
- ✅ Production environment accessible
- ✅ Preview deployments work for PRs
- ✅ Environment variables properly configured
- ✅ Database migrations run on deployment

---

### Issue #9: Configure Sentry Error Tracking

**Labels:** `monitoring`, `infrastructure`, `phase-1`, `priority:medium`
**Milestone:** Phase 1 - Foundation
**Estimated Effort:** 3 hours
**Dependencies:** #1, #8

**Description:**
Setup Sentry for error tracking across client, server, and edge runtimes.

**Tasks:**
- [ ] Create Sentry account and project
- [ ] Install Sentry SDK packages
- [ ] Create `instrumentation-client.ts` for client-side tracking
- [ ] Create `sentry.server.config.ts` for server-side tracking
- [ ] Create `sentry.edge.config.ts` for edge runtime tracking
- [ ] Add Sentry environment variables:
  - `SENTRY_DSN`
  - `SENTRY_ORG`
  - `SENTRY_PROJECT`
- [ ] Configure source maps upload
- [ ] Enable session replay (optional)
- [ ] Enable performance monitoring
- [ ] Test error capture in all runtimes
- [ ] Configure alert notifications

**Acceptance Criteria:**
- ✅ Sentry captures client-side errors
- ✅ Sentry captures server-side errors
- ✅ Sentry captures edge runtime errors
- ✅ Source maps uploaded for readable stack traces
- ✅ Performance metrics visible in Sentry dashboard

---

### Issue #10: Create Comprehensive Seed Data System

**Labels:** `database`, `testing`, `phase-1`, `priority:high`
**Milestone:** Phase 1 - Foundation
**Estimated Effort:** 6 hours
**Dependencies:** #4

**Description:**
Build modular seed data system with platform admin, sample bakeries, and realistic bakery data.

**Tasks:**
- [ ] Create `prisma/seed.ts` orchestration file
- [ ] Create `prisma/data/` directory for modular data
- [ ] Create `platform-admin.ts` - Your platform admin account (use env var for email)
- [ ] Create `bakeries.ts` - 2-3 sample bakery organizations
- [ ] Create `users.ts` - Sample user accounts with roles
- [ ] Create `roles.ts` - Default role templates per bakery
- [ ] Create `recipes.ts` - Multi-step recipes (5-10 recipes)
- [ ] Create `ingredients.ts` - Common bakery ingredients (20-30 items)
- [ ] Create `vendors.ts` - Sample vendors (3-5 vendors)
- [ ] Create `equipment.ts` - Equipment samples with various statuses
- [ ] Create `conversions.ts` - Unit conversion factors
- [ ] Create sample inventory transactions
- [ ] Create sample bake sheets
- [ ] Add `PLATFORM_ADMIN_EMAIL` environment variable
- [ ] Document seed data structure
- [ ] Test seed script: `npm run db:seed`

**Acceptance Criteria:**
- ✅ Seed script runs without errors
- ✅ Platform admin account created with your email
- ✅ Multiple bakeries with realistic data
- ✅ Users assigned to bakeries with roles
- ✅ Recipes with multi-step sections
- ✅ Ingredients linked to vendors
- ✅ Equipment with various statuses
- ✅ Unit conversions populated
- ✅ Can reset and re-seed database

**Environment Variable:**
```bash
PLATFORM_ADMIN_EMAIL=your.email@example.com
```

---

## Phase 2: Platform Admin Features

### Issue #11: Implement Platform Admin Authentication Flow

**Labels:** `platform-admin`, `auth`, `phase-2`, `priority:critical`
**Milestone:** Phase 2 - Platform Admin
**Estimated Effort:** 4 hours
**Dependencies:** #5, #4

**Description:**
Create authentication flow that checks `isPlatformAdmin` flag and routes users appropriately.

**Tasks:**
- [ ] Create middleware to check platform admin status
- [ ] Create `/admin` route protection
- [ ] Create helper function: `checkPlatformPermission(userId)`
- [ ] Redirect non-platform-admins away from `/admin`
- [ ] Create platform admin context/hook
- [ ] Add platform admin indicator in UI
- [ ] Test with platform admin and regular users
- [ ] Document platform admin access control

**Acceptance Criteria:**
- ✅ Platform admins can access `/admin` routes
- ✅ Regular users redirected from `/admin` routes
- ✅ Platform admin status visible in UI
- ✅ Middleware blocks unauthorized access

---

### Issue #12: Build Platform Admin Dashboard Layout

**Labels:** `platform-admin`, `frontend`, `ui`, `phase-2`, `priority:high`
**Milestone:** Phase 2 - Platform Admin
**Estimated Effort:** 6 hours
**Dependencies:** #11, #2

**Description:**
Create platform admin dashboard layout with distinct visual theme and navigation.

**Tasks:**
- [ ] Create `/app/admin/layout.tsx` with admin-specific layout
- [ ] Design admin dashboard home page (`/admin`)
- [ ] Create admin navigation sidebar with sections:
  - Dashboard (overview)
  - Bakeries
  - Users
  - Analytics
  - Settings
- [ ] Use distinct color scheme for admin section
- [ ] Add platform admin icon/badge
- [ ] Create dashboard metric cards:
  - Total bakeries
  - Total users
  - Active users
  - Recent activity
- [ ] Make responsive for mobile/tablet/desktop
- [ ] Add breadcrumb navigation

**Acceptance Criteria:**
- ✅ Admin layout visually distinct from bakery UI
- ✅ Navigation sidebar functional
- ✅ Dashboard shows key metrics
- ✅ Responsive on all screen sizes
- ✅ Breadcrumbs show current location

---

### Issue #13: Implement Bakery CRUD Operations

**Labels:** `platform-admin`, `backend`, `frontend`, `phase-2`, `priority:critical`
**Milestone:** Phase 2 - Platform Admin
**Estimated Effort:** 8 hours
**Dependencies:** #11, #12

**Description:**
Create complete bakery management system for platform admins.

**Backend Tasks:**
- [ ] Create API route: `POST /api/admin/bakeries` - Create bakery
- [ ] Create API route: `GET /api/admin/bakeries` - List all bakeries
- [ ] Create API route: `GET /api/admin/bakeries/[id]` - Get bakery details
- [ ] Create API route: `PATCH /api/admin/bakeries/[id]` - Update bakery
- [ ] Create API route: `DELETE /api/admin/bakeries/[id]` - Soft delete bakery
- [ ] Add validation with Zod schemas
- [ ] Implement platform admin permission checks
- [ ] Add error handling
- [ ] Create audit logging for bakery operations

**Frontend Tasks:**
- [ ] Create `/app/admin/bakeries/page.tsx` - Bakery list view
- [ ] Create `/app/admin/bakeries/new/page.tsx` - Create bakery form
- [ ] Create `/app/admin/bakeries/[id]/page.tsx` - Bakery detail view
- [ ] Create `/app/admin/bakeries/[id]/edit/page.tsx` - Edit bakery form
- [ ] Add search and filter functionality
- [ ] Add active/inactive status toggle
- [ ] Add bakery metrics (user count, recipe count)
- [ ] Add confirmation modals for delete operations
- [ ] Display success/error toast notifications

**Acceptance Criteria:**
- ✅ Platform admin can create new bakeries
- ✅ Platform admin can list all bakeries with search/filter
- ✅ Platform admin can view bakery details
- ✅ Platform admin can edit bakery information
- ✅ Platform admin can soft delete bakeries (set `isActive = false`)
- ✅ Non-platform-admins cannot access these endpoints
- ✅ All operations logged for audit trail
- ✅ Input validation prevents invalid data

---

### Issue #14: Implement Cross-Tenant User Management

**Labels:** `platform-admin`, `backend`, `frontend`, `phase-2`, `priority:high`
**Milestone:** Phase 2 - Platform Admin
**Estimated Effort:** 10 hours
**Dependencies:** #11, #12, #13

**Description:**
Build user management interface for platform admins to manage users across all bakeries.

**Backend Tasks:**
- [ ] Create API route: `GET /api/admin/users` - List all users (cross-tenant)
- [ ] Create API route: `GET /api/admin/users/[id]` - Get user details
- [ ] Create API route: `PATCH /api/admin/users/[id]/bakery` - Assign user to bakery
- [ ] Create API route: `PATCH /api/admin/users/[id]/promote` - Promote to platform admin
- [ ] Add filters: by bakery, by platform admin status, by email/name
- [ ] Add sorting: by name, by created date, by last login
- [ ] Implement platform admin permission checks
- [ ] Add audit logging for user management actions
- [ ] Send email notifications for user assignments/promotions (via SES)

**Frontend Tasks:**
- [ ] Create `/app/admin/users/page.tsx` - User list view
- [ ] Create `/app/admin/users/[id]/page.tsx` - User detail view
- [ ] Add search bar (filter by name, email)
- [ ] Add filter dropdowns (by bakery, by platform admin status)
- [ ] Create user assignment modal (assign to bakery)
- [ ] Create platform admin promotion modal
- [ ] Display user activity (last login, created date)
- [ ] Show user's bakery and role
- [ ] Add confirmation for critical actions
- [ ] Display toast notifications

**Acceptance Criteria:**
- ✅ Platform admin can view all users across all bakeries
- ✅ Search/filter users by various criteria
- ✅ Assign users to bakeries
- ✅ Promote users to platform admin
- ✅ View user activity and metadata
- ✅ Email notifications sent for assignments/promotions
- ✅ All actions logged in audit trail
- ✅ Non-platform-admins cannot access

---

### Issue #15: Build Platform Analytics Dashboard

**Labels:** `platform-admin`, `frontend`, `analytics`, `phase-2`, `priority:medium`
**Milestone:** Phase 2 - Platform Admin
**Estimated Effort:** 6 hours
**Dependencies:** #12, #13, #14

**Description:**
Create analytics dashboard showing cross-tenant metrics for platform admins.

**Backend Tasks:**
- [ ] Create API route: `GET /api/admin/analytics` - Platform-wide analytics
- [ ] Aggregate metrics:
  - Total bakeries (active vs inactive)
  - Total users (by bakery)
  - Total recipes (cross-tenant)
  - Total ingredients (cross-tenant)
  - Growth metrics (new bakeries/users this month)
  - Active users (logged in last 30 days)
- [ ] Add caching for expensive queries
- [ ] Implement platform admin permission check

**Frontend Tasks:**
- [ ] Create `/app/admin/analytics/page.tsx`
- [ ] Design metric cards:
  - Total bakeries
  - Total users
  - Total recipes
  - Active users (last 30 days)
- [ ] Create charts/graphs (if time permits):
  - Bakery growth over time
  - User activity over time
- [ ] Add date range selector (optional)
- [ ] Make responsive

**Acceptance Criteria:**
- ✅ Analytics page shows key platform metrics
- ✅ Metrics accurate and update in real-time
- ✅ Performance optimized with caching
- ✅ Responsive design
- ✅ Only accessible to platform admins

---

### Issue #16: Implement Audit Logging System

**Labels:** `platform-admin`, `backend`, `security`, `phase-2`, `priority:high`
**Milestone:** Phase 2 - Platform Admin
**Estimated Effort:** 5 hours
**Dependencies:** #13, #14

**Description:**
Create audit logging system to track platform admin actions.

**Tasks:**
- [ ] Create `AuditLog` Prisma model:
  - `id`, `userId`, `action`, `entityType`, `entityId`, `changes`, `timestamp`
- [ ] Create migration for audit log table
- [ ] Create audit logging utility function: `createAuditLog()`
- [ ] Log platform admin actions:
  - Bakery creation/deletion
  - User bakery assignments
  - Platform admin promotions
  - Critical setting changes
- [ ] Create API route: `GET /api/admin/audit-logs` - View audit logs
- [ ] Create frontend view: `/app/admin/audit-logs/page.tsx`
- [ ] Add filtering by user, action type, date range
- [ ] Display audit log table with details

**Acceptance Criteria:**
- ✅ All platform admin actions logged
- ✅ Audit logs stored in database
- ✅ Platform admins can view audit logs
- ✅ Logs include user, action, timestamp, details
- ✅ Filter and search audit logs

---

## Phase 3: Core Bakery Features

### Issue #17: Implement Dynamic Role System (Bakery-Scoped)

**Labels:** `roles`, `permissions`, `backend`, `frontend`, `phase-3`, `priority:critical`
**Milestone:** Phase 3 - Core Features
**Estimated Effort:** 10 hours
**Dependencies:** #4, #5

**Description:**
Build dynamic role and permission system allowing bakery admins to create custom roles.

**Backend Tasks:**
- [ ] Create API routes:
  - `GET /api/roles` - List roles for current bakery
  - `POST /api/roles` - Create role (bakery admin only)
  - `GET /api/roles/[id]` - Get role details
  - `PATCH /api/roles/[id]` - Update role
  - `DELETE /api/roles/[id]` - Delete role
- [ ] Implement permission checking helper: `checkBakeryPermission(userId, permission)`
- [ ] Create permission middleware for API routes
- [ ] Define permission constants (recipes.read, inventory.write, etc.)
- [ ] Add bakery-scoping to all role operations
- [ ] Validate JSON permissions structure
- [ ] Prevent deletion of roles with assigned users

**Frontend Tasks:**
- [ ] Create `/app/(dashboard)/settings/roles/page.tsx` - Role list
- [ ] Create `/app/(dashboard)/settings/roles/new/page.tsx` - Create role
- [ ] Create `/app/(dashboard)/settings/roles/[id]/page.tsx` - Role detail
- [ ] Create `/app/(dashboard)/settings/roles/[id]/edit/page.tsx` - Edit role
- [ ] Create permission matrix component (checkboxes for all permissions)
- [ ] Display users assigned to each role
- [ ] Add role templates (suggested defaults)
- [ ] Add confirmation for role deletion
- [ ] Show permission inheritance/conflicts

**Acceptance Criteria:**
- ✅ Bakery admins can create/edit/delete roles
- ✅ Permissions stored as JSON and validated
- ✅ Permission checking works across all API routes
- ✅ Users assigned to roles get correct permissions
- ✅ Platform admins can view all bakery roles (read-only)
- ✅ Data scoped by bakery (users can't edit other bakery roles)

---

### Issue #18: Build Recipe Management System

**Labels:** `recipes`, `backend`, `frontend`, `phase-3`, `priority:high`
**Milestone:** Phase 3 - Core Features
**Estimated Effort:** 12 hours
**Dependencies:** #4, #17

**Description:**
Implement multi-step recipe management with sections and ingredient lists.

**Backend Tasks:**
- [ ] Create API routes:
  - `GET /api/recipes` - List recipes (bakery-scoped)
  - `POST /api/recipes` - Create recipe
  - `GET /api/recipes/[id]` - Get recipe with sections
  - `PATCH /api/recipes/[id]` - Update recipe
  - `DELETE /api/recipes/[id]` - Delete recipe
  - `POST /api/recipes/[id]/sections` - Add section
  - `PATCH /api/recipes/sections/[id]` - Update section
  - `DELETE /api/recipes/sections/[id]` - Delete section
  - `POST /api/recipes/sections/[id]/ingredients` - Add ingredient to section
- [ ] Implement recipe costing calculation logic
- [ ] Add bakery-scoping to all recipe operations
- [ ] Add permission checks (recipes.read, recipes.write)
- [ ] Validate recipe data (name, yield, sections)

**Frontend Tasks:**
- [ ] Create `/app/(dashboard)/recipes/page.tsx` - Recipe list
- [ ] Create `/app/(dashboard)/recipes/new/page.tsx` - Create recipe
- [ ] Create `/app/(dashboard)/recipes/[id]/page.tsx` - Recipe detail view
- [ ] Create `/app/(dashboard)/recipes/[id]/edit/page.tsx` - Edit recipe
- [ ] Create section management UI:
  - Add/remove sections
  - Reorder sections (drag-and-drop)
  - Edit section names and instructions
- [ ] Create ingredient selector for each section
- [ ] Display recipe cost breakdown:
  - Section-by-section costs
  - Ingredient-by-ingredient detail
  - Per-unit cost (total cost ÷ yield)
- [ ] Add search and filter functionality
- [ ] Add recipe duplication feature (optional)

**Acceptance Criteria:**
- ✅ Users can create multi-step recipes with sections
- ✅ Each section can have multiple ingredients
- ✅ Recipe cost auto-calculates from ingredients
- ✅ Recipes display correctly with all sections
- ✅ Section order can be rearranged
- ✅ Search/filter recipes by name
- ✅ Permission checks enforce access control
- ✅ Data scoped by bakery

---

### Issue #19: Build Ingredient Catalog and Management

**Labels:** `ingredients`, `backend`, `frontend`, `phase-3`, `priority:high`
**Milestone:** Phase 3 - Core Features
**Estimated Effort:** 8 hours
**Dependencies:** #4, #17

**Description:**
Create ingredient catalog with vendor linking and cost tracking.

**Backend Tasks:**
- [ ] Create API routes:
  - `GET /api/ingredients` - List ingredients (bakery-scoped)
  - `POST /api/ingredients` - Create ingredient
  - `GET /api/ingredients/[id]` - Get ingredient details
  - `PATCH /api/ingredients/[id]` - Update ingredient
  - `DELETE /api/ingredients/[id]` - Delete ingredient
- [ ] Add bakery-scoping
- [ ] Add permission checks (inventory.read, inventory.write)
- [ ] Validate ingredient data
- [ ] Prevent deletion of ingredients used in recipes

**Frontend Tasks:**
- [ ] Create `/app/(dashboard)/ingredients/page.tsx` - Ingredient list
- [ ] Create `/app/(dashboard)/ingredients/new/page.tsx` - Create ingredient
- [ ] Create `/app/(dashboard)/ingredients/[id]/page.tsx` - Ingredient detail
- [ ] Create `/app/(dashboard)/ingredients/[id]/edit/page.tsx` - Edit ingredient
- [ ] Add search bar (filter by name)
- [ ] Add filter by vendor
- [ ] Display current quantity and cost per unit
- [ ] Link to vendor (if assigned)
- [ ] Show recipes using this ingredient
- [ ] Add low stock indicator (visual only)

**Acceptance Criteria:**
- ✅ Users can create/edit/delete ingredients
- ✅ Ingredients linked to vendors
- ✅ Current quantity and cost tracked
- ✅ Search/filter by name and vendor
- ✅ Cannot delete ingredients used in recipes
- ✅ Permission checks enforce access control
- ✅ Data scoped by bakery

---

### Issue #20: Build Vendor Management System

**Labels:** `vendors`, `backend`, `frontend`, `phase-3`, `priority:medium`
**Milestone:** Phase 3 - Core Features
**Estimated Effort:** 6 hours
**Dependencies:** #4, #17

**Description:**
Create vendor management system with contact information and relationships.

**Backend Tasks:**
- [ ] Create API routes:
  - `GET /api/vendors` - List vendors (bakery-scoped)
  - `POST /api/vendors` - Create vendor
  - `GET /api/vendors/[id]` - Get vendor details
  - `PATCH /api/vendors/[id]` - Update vendor
  - `DELETE /api/vendors/[id]` - Delete vendor
  - `POST /api/vendors/[id]/contacts` - Add contact
  - `PATCH /api/vendors/contacts/[id]` - Update contact
  - `DELETE /api/vendors/contacts/[id]` - Delete contact
- [ ] Add bakery-scoping
- [ ] Add permission checks
- [ ] Validate vendor data

**Frontend Tasks:**
- [ ] Create `/app/(dashboard)/vendors/page.tsx` - Vendor list
- [ ] Create `/app/(dashboard)/vendors/new/page.tsx` - Create vendor
- [ ] Create `/app/(dashboard)/vendors/[id]/page.tsx` - Vendor detail
- [ ] Create `/app/(dashboard)/vendors/[id]/edit/page.tsx` - Edit vendor
- [ ] Display vendor contacts with add/edit/delete
- [ ] Show linked ingredients and equipment
- [ ] Add search functionality
- [ ] Make contact management intuitive (inline editing)

**Acceptance Criteria:**
- ✅ Users can create/edit/delete vendors
- ✅ Multiple contacts per vendor supported
- ✅ Vendors linked to ingredients and equipment
- ✅ Search vendors by name
- ✅ Permission checks enforce access control
- ✅ Data scoped by bakery

---

### Issue #21: Build Equipment Tracking System

**Labels:** `equipment`, `backend`, `frontend`, `phase-3`, `priority:medium`
**Milestone:** Phase 3 - Core Features
**Estimated Effort:** 8 hours
**Dependencies:** #4, #17, #20

**Description:**
Create equipment tracking with status workflow (Considering → Ordered → Received → In Use → Maintenance → Retired).

**Backend Tasks:**
- [ ] Create API routes:
  - `GET /api/equipment` - List equipment (bakery-scoped)
  - `POST /api/equipment` - Create equipment
  - `GET /api/equipment/[id]` - Get equipment details
  - `PATCH /api/equipment/[id]` - Update equipment
  - `DELETE /api/equipment/[id]` - Delete equipment
  - `PATCH /api/equipment/[id]/status` - Update status
- [ ] Add bakery-scoping
- [ ] Add permission checks
- [ ] Validate status transitions
- [ ] Track status change history (optional)

**Frontend Tasks:**
- [ ] Create `/app/(dashboard)/equipment/page.tsx` - Equipment list
- [ ] Create `/app/(dashboard)/equipment/new/page.tsx` - Create equipment
- [ ] Create `/app/(dashboard)/equipment/[id]/page.tsx` - Equipment detail
- [ ] Create `/app/(dashboard)/equipment/[id]/edit/page.tsx` - Edit equipment
- [ ] Display equipment grouped/filtered by status
- [ ] Add status change buttons with confirmation
- [ ] Show vendor linkage
- [ ] Display purchase date, cost, serial number
- [ ] Add search and filter functionality

**Acceptance Criteria:**
- ✅ Users can create/edit/delete equipment
- ✅ Status workflow enforced (sequential or allow jumps)
- ✅ Equipment linked to vendors
- ✅ Filter by status
- ✅ Search by name
- ✅ Permission checks enforce access control
- ✅ Data scoped by bakery

---

## Phase 4: Advanced Features

### Issue #22: Implement Transaction-Based Inventory System

**Labels:** `inventory`, `backend`, `frontend`, `phase-4`, `priority:high`
**Milestone:** Phase 4 - Advanced Features
**Estimated Effort:** 10 hours
**Dependencies:** #19

**Description:**
Build transaction-based inventory tracking system (RECEIVE, USE, ADJUST, WASTE).

**Backend Tasks:**
- [ ] Create API routes:
  - `GET /api/inventory/transactions` - List transactions (bakery-scoped)
  - `POST /api/inventory/transactions` - Create transaction
  - `GET /api/inventory/transactions/[id]` - Get transaction details
  - `GET /api/ingredients/[id]/transactions` - Get transactions for ingredient
- [ ] Implement transaction types: RECEIVE, USE, ADJUST, WASTE
- [ ] Update `Ingredient.currentQty` on transaction creation
- [ ] Add validation (prevent negative quantities)
- [ ] Add bakery-scoping
- [ ] Add permission checks (inventory.adjust for ADJUST/WASTE)
- [ ] Track transaction source (user, bake sheet, manual)

**Frontend Tasks:**
- [ ] Create `/app/(dashboard)/inventory/page.tsx` - Inventory overview
- [ ] Create transaction history view per ingredient
- [ ] Create quick action modals:
  - "Receive Inventory" (RECEIVE transaction)
  - "Manual Adjustment" (ADJUST transaction)
  - "Record Waste" (WASTE transaction)
- [ ] Display transaction history table with filters
- [ ] Show current quantity for each ingredient
- [ ] Add low stock indicators
- [ ] Filter transactions by type, ingredient, date range

**Acceptance Criteria:**
- ✅ All inventory changes recorded as transactions
- ✅ Current quantity updates automatically
- ✅ Transaction history visible per ingredient
- ✅ Cannot create transactions resulting in negative inventory
- ✅ Quick actions streamline common workflows
- ✅ Permission checks enforce access control
- ✅ Data scoped by bakery

---

### Issue #23: Build Bake Sheet Management System

**Labels:** `bake-sheets`, `backend`, `frontend`, `phase-4`, `priority:high`
**Milestone:** Phase 4 - Advanced Features
**Estimated Effort:** 12 hours
**Dependencies:** #18, #22

**Description:**
Create bake sheet system for production planning with automatic inventory deduction on completion.

**Backend Tasks:**
- [ ] Create API routes:
  - `GET /api/bake-sheets` - List bake sheets (bakery-scoped)
  - `POST /api/bake-sheets` - Create bake sheet
  - `GET /api/bake-sheets/[id]` - Get bake sheet details
  - `PATCH /api/bake-sheets/[id]` - Update bake sheet
  - `DELETE /api/bake-sheets/[id]` - Delete bake sheet
  - `POST /api/bake-sheets/[id]/complete` - Mark as completed
- [ ] Implement completion workflow:
  - Calculate ingredient quantities (recipe qty × scale)
  - Create USE transactions for all ingredients
  - Update inventory quantities
  - Record completion timestamp and user
- [ ] Handle unit conversions during inventory deduction
- [ ] Add bakery-scoping
- [ ] Add permission checks
- [ ] Prevent duplicate completions

**Frontend Tasks:**
- [ ] Create `/app/(dashboard)/bake-sheets/page.tsx` - Bake sheet list
- [ ] Create `/app/(dashboard)/bake-sheets/new/page.tsx` - Create bake sheet
- [ ] Create `/app/(dashboard)/bake-sheets/[id]/page.tsx` - Bake sheet detail
- [ ] Display recipe with calculated ingredient quantities
- [ ] Show scale/multiplier input
- [ ] Display total cost and per-unit cost
- [ ] Add "Mark Completed" button with confirmation
- [ ] Filter by completed/incomplete status
- [ ] Show completion timestamp and user
- [ ] Display linked inventory transactions

**Acceptance Criteria:**
- ✅ Users can create bake sheets from recipes
- ✅ Scale/multiplier adjusts ingredient quantities
- ✅ Completion triggers automatic inventory deduction
- ✅ Cannot complete bake sheet if insufficient inventory
- ✅ Completion recorded with timestamp and user
- ✅ Cost calculations accurate
- ✅ Unit conversions applied correctly
- ✅ Permission checks enforce access control
- ✅ Data scoped by bakery

---

### Issue #24: Integrate MDX Editor with S3 Uploads

**Labels:** `mdx`, `rich-text`, `frontend`, `integration`, `phase-4`, `priority:high`
**Milestone:** Phase 4 - Advanced Features
**Estimated Effort:** 10 hours
**Dependencies:** #6, #18

**Description:**
Integrate MDX editor for rich recipe instructions with S3 image/attachment uploads.

**Backend Tasks:**
- [ ] Create API route: `POST /api/upload/presigned-url` - Generate S3 presigned URL
- [ ] Validate file type and size
- [ ] Return presigned URL with expiration
- [ ] Add bakery-scoping for uploads
- [ ] Add permission checks (recipes.write)

**Frontend Tasks:**
- [ ] Create `components/MDXEditor.tsx` client component
- [ ] Import `@mdxeditor/editor` with Next.js compatibility
- [ ] Configure MDX plugins:
  - Table support
  - Code blocks
  - Image uploads
  - Headings, lists, formatting
- [ ] Implement image upload flow:
  - Get presigned URL from API
  - Upload file to S3 from browser
  - Insert image markdown with S3 URL
- [ ] Add to recipe section instruction editor
- [ ] Test markdown rendering
- [ ] Add error handling for failed uploads
- [ ] Apply styling (match theme)

**Acceptance Criteria:**
- ✅ MDX editor renders in recipe instruction fields
- ✅ Users can format text (bold, italic, lists, tables)
- ✅ Image uploads work and insert S3 URLs
- ✅ Uploaded images display in editor preview
- ✅ File size/type validation enforced
- ✅ Editor styled consistently with app theme
- ✅ No Next.js SSR issues

**Resources:**
- MDX Editor docs: https://mdxeditor.dev/
- Next.js config: See specification section "Rich Text Editing"

---

### Issue #25: Implement Unit Conversion System

**Labels:** `conversions`, `backend`, `frontend`, `phase-4`, `priority:medium`
**Milestone:** Phase 4 - Advanced Features
**Estimated Effort:** 6 hours
**Dependencies:** #4, #19, #23

**Description:**
Build unit conversion system for automatic metric/imperial conversions in inventory and recipes.

**Backend Tasks:**
- [ ] Seed `UnitConversion` table with standard conversions:
  - Weight: g ↔ kg ↔ lbs ↔ oz
  - Volume: ml ↔ L ↔ cups ↔ tbsp ↔ tsp ↔ fl oz
- [ ] Create utility function: `convertUnits(value, fromUnit, toUnit)`
- [ ] Create API route: `GET /api/conversions` - List conversions
- [ ] Create API route: `POST /api/conversions` - Add custom conversion (admin)
- [ ] Apply conversions in inventory deduction logic
- [ ] Apply conversions in recipe cost calculations

**Frontend Tasks:**
- [ ] Create conversion management UI (admin only)
- [ ] Display conversions in ingredient/recipe views (optional)
- [ ] Add unit selector dropdowns where applicable
- [ ] Test conversion accuracy

**Acceptance Criteria:**
- ✅ Standard conversions seeded in database
- ✅ Conversion utility function works correctly
- ✅ Inventory deductions handle different units
- ✅ Recipe costs calculated correctly across units
- ✅ Admins can add custom conversions
- ✅ Conversions accurate (tested with known values)

---

## Phase 5: UI/UX & Polish

### Issue #26: Build Collapsible Sidebar Navigation

**Labels:** `frontend`, `ui`, `navigation`, `phase-5`, `priority:high`
**Milestone:** Phase 5 - Polish
**Estimated Effort:** 8 hours
**Dependencies:** #2

**Description:**
Create responsive collapsible sidebar navigation with persistent state.

**Tasks:**
- [ ] Create `components/layout/Sidebar.tsx` component
- [ ] Implement toggle open/closed functionality
- [ ] Persist sidebar state (localStorage or cookie)
- [ ] Add navigation sections:
  - Recipes
  - Ingredients
  - Inventory
  - Vendors
  - Equipment
  - Bake Sheets
  - Settings
- [ ] Add Platform Admin section (conditional on `isPlatformAdmin`)
- [ ] Style with distinct colors for admin section
- [ ] Make responsive:
  - Desktop: Persistent sidebar
  - Tablet: Collapsible sidebar
  - Mobile: Drawer overlay
- [ ] Add active route highlighting
- [ ] Add icons (Lucide React)
- [ ] Test across screen sizes

**Acceptance Criteria:**
- ✅ Sidebar toggles open/closed smoothly
- ✅ State persists across page reloads
- ✅ Responsive on desktop/tablet/mobile
- ✅ Platform admin section only visible to platform admins
- ✅ Active route highlighted
- ✅ Icons enhance navigation clarity

---

### Issue #27: Implement Search and Filtering Across All Pages

**Labels:** `frontend`, `ui`, `search`, `phase-5`, `priority:medium`
**Milestone:** Phase 5 - Polish
**Estimated Effort:** 6 hours
**Dependencies:** #18, #19, #20, #21, #23

**Description:**
Add consistent search and filter functionality to all list views.

**Tasks:**
- [ ] Create reusable search bar component
- [ ] Create reusable filter dropdown component
- [ ] Add search/filter to recipes page
- [ ] Add search/filter to ingredients page
- [ ] Add search/filter to vendors page
- [ ] Add search/filter to equipment page
- [ ] Add search/filter to bake sheets page
- [ ] Add search/filter to platform admin pages (bakeries, users)
- [ ] Implement debounced search (reduce API calls)
- [ ] Add "Clear filters" button
- [ ] Persist filter state in URL query params (optional)

**Acceptance Criteria:**
- ✅ Search functionality on all list pages
- ✅ Filters appropriate to each page context
- ✅ Search debounced for performance
- ✅ Results update in real-time
- ✅ Filters clearable easily
- ✅ Consistent UI across all pages

---

### Issue #28: Add Toast Notification System

**Labels:** `frontend`, `ui`, `notifications`, `phase-5`, `priority:medium`
**Milestone:** Phase 5 - Polish
**Estimated Effort:** 4 hours
**Dependencies:** #2

**Description:**
Implement toast notification system for user feedback on actions.

**Tasks:**
- [ ] Install toast library (e.g., `react-hot-toast` or `sonner`)
- [ ] Create toast configuration and provider
- [ ] Style toasts to match theme
- [ ] Add success toasts for:
  - Create operations
  - Update operations
  - Delete operations
- [ ] Add error toasts for:
  - Failed API calls
  - Validation errors
  - Permission denials
- [ ] Add loading toasts for long operations
- [ ] Test across all features
- [ ] Make responsive and accessible

**Acceptance Criteria:**
- ✅ Toasts appear for all user actions
- ✅ Success/error/loading states clearly distinguished
- ✅ Toasts auto-dismiss after appropriate duration
- ✅ Toasts styled consistently
- ✅ Accessible (screen reader friendly)

---

### Issue #29: Add Loading States and Skeletons

**Labels:** `frontend`, `ui`, `loading`, `phase-5`, `priority:low`
**Milestone:** Phase 5 - Polish
**Estimated Effort:** 4 hours
**Dependencies:** All feature issues

**Description:**
Add loading states and skeleton screens to improve perceived performance.

**Tasks:**
- [ ] Create skeleton components:
  - List skeleton
  - Card skeleton
  - Form skeleton
  - Table skeleton
- [ ] Add loading states to all pages:
  - While fetching recipes
  - While fetching ingredients
  - While fetching vendors
  - While fetching equipment
  - While fetching bake sheets
  - While fetching platform admin data
- [ ] Use React Suspense where appropriate
- [ ] Add loading spinners for button actions
- [ ] Test loading states by simulating slow network

**Acceptance Criteria:**
- ✅ Skeleton screens shown while data loads
- ✅ Loading spinners on action buttons
- ✅ No jarring layout shifts
- ✅ Smooth transition from loading to content

---

### Issue #30: Implement Error Boundaries and Error Pages

**Labels:** `frontend`, `error-handling`, `phase-5`, `priority:medium`
**Milestone:** Phase 5 - Polish
**Estimated Effort:** 4 hours
**Dependencies:** #9

**Description:**
Add comprehensive error handling with error boundaries and custom error pages.

**Tasks:**
- [ ] Create React error boundary component
- [ ] Create `app/error.tsx` for global errors
- [ ] Create `app/not-found.tsx` for 404 errors
- [ ] Create `app/api/error.ts` for API error handling
- [ ] Add user-friendly error messages
- [ ] Add "Try again" functionality
- [ ] Log errors to Sentry
- [ ] Test error scenarios:
  - Component render errors
  - API errors
  - 404 pages
  - Permission denied

**Acceptance Criteria:**
- ✅ Error boundaries catch React errors
- ✅ Custom 404 page shows for missing routes
- ✅ API errors display user-friendly messages
- ✅ Errors logged to Sentry
- ✅ Users can recover from errors (try again)

---

### Issue #31: Optimize Responsive Design for Mobile/Tablet

**Labels:** `frontend`, `ui`, `responsive`, `phase-5`, `priority:high`
**Milestone:** Phase 5 - Polish
**Estimated Effort:** 8 hours
**Dependencies:** All UI components

**Description:**
Ensure all pages are fully responsive and optimized for mobile and tablet devices.

**Tasks:**
- [ ] Test all pages on mobile (320px-767px)
- [ ] Test all pages on tablet (768px-1023px)
- [ ] Test all pages on desktop (1024px+)
- [ ] Fix layout issues on small screens:
  - Forms should be single-column on mobile
  - Tables should scroll horizontally or stack
  - Navigation should use drawer on mobile
  - Buttons/inputs should have proper tap targets (44px min)
- [ ] Optimize forms for mobile input:
  - Use appropriate input types
  - Add autocomplete attributes
  - Test keyboard behavior
- [ ] Test with Chrome DevTools device emulation
- [ ] Test on real devices (iOS, Android)
- [ ] Fix any rendering issues
- [ ] Ensure touch interactions work smoothly

**Acceptance Criteria:**
- ✅ All pages usable on mobile devices
- ✅ All pages usable on tablets
- ✅ No horizontal scrolling on mobile
- ✅ Touch targets appropriately sized
- ✅ Forms optimized for mobile input
- ✅ Navigation works on all screen sizes

---

### Issue #32: Create Comprehensive Documentation

**Labels:** `documentation`, `phase-5`, `priority:medium`
**Milestone:** Phase 5 - Polish
**Estimated Effort:** 6 hours
**Dependencies:** All features complete

**Description:**
Write comprehensive documentation for developers and end-users.

**Tasks:**
- [ ] Update `README.md` with:
  - Project overview
  - Tech stack
  - Setup instructions (local development)
  - Environment variables
  - Database setup
  - Running the app
  - Deployment
- [ ] Create `CONTRIBUTING.md` with:
  - Git workflow
  - Commit conventions
  - Pull request process
  - Code style guidelines
- [ ] Create `docs/DATABASE.md` with:
  - Schema overview
  - Migration workflow
  - Seed data system
  - Backup/restore procedures
- [ ] Create `docs/DEPLOYMENT.md` with:
  - Vercel deployment process
  - Environment variable setup
  - Database migration deployment
  - Rollback procedures
- [ ] Create `docs/ARCHITECTURE.md` with:
  - Multi-tenancy approach
  - Authentication/authorization
  - Permission system
  - Data scoping strategy
- [ ] Create user guide (optional):
  - How to use platform admin features
  - How to manage bakery
  - How to create recipes
  - How to manage inventory

**Acceptance Criteria:**
- ✅ README complete and accurate
- ✅ Setup instructions work for new developers
- ✅ All docs written in clear language
- ✅ Architecture explained for maintainability

---

### Issue #33: Production Deployment and Testing

**Labels:** `devops`, `deployment`, `phase-5`, `priority:critical`
**Milestone:** Phase 5 - Polish
**Estimated Effort:** 8 hours
**Dependencies:** All features complete, #8, #32

**Description:**
Deploy application to production and perform final testing.

**Tasks:**
- [ ] Review Vercel production environment variables
- [ ] Verify database production credentials
- [ ] Test production deployment:
  - Build succeeds
  - Migrations apply correctly
  - App loads successfully
- [ ] Setup custom domain (if available)
- [ ] Configure SSL certificate
- [ ] Test authentication in production
- [ ] Run seed script in production (platform admin only)
- [ ] Verify Sentry error tracking works
- [ ] Test email sending (SES in production mode)
- [ ] Test S3 uploads in production
- [ ] Perform end-to-end testing:
  - Platform admin workflows
  - Bakery user workflows
  - All CRUD operations
  - Inventory transactions
  - Bake sheet completion
- [ ] Load testing (optional)
- [ ] Security audit (basic check)
- [ ] Performance audit (Lighthouse)
- [ ] Fix any production-specific issues
- [ ] Document production URLs and credentials securely

**Acceptance Criteria:**
- ✅ Production deployment successful
- ✅ All features work in production
- ✅ Platform admin account accessible
- ✅ Sample bakery data seeded
- ✅ No critical errors in Sentry
- ✅ Performance meets requirements (Core Web Vitals)
- ✅ Security best practices followed

---

## Additional Issues (Optional Enhancements)

### Issue #34: Email Notification System (via SES)

**Labels:** `email`, `integration`, `enhancement`
**Milestone:** Future Enhancements
**Estimated Effort:** 6 hours
**Dependencies:** #7

**Description:**
Implement email notifications for key events using AWS SES.

**Tasks:**
- [ ] Create email templates:
  - User invitation to bakery
  - Platform admin promotion notification
  - Low stock alert (future)
  - Bake sheet completion notification (future)
- [ ] Create email sending utility function
- [ ] Trigger emails on:
  - User assigned to bakery
  - User promoted to platform admin
- [ ] Test email delivery
- [ ] Handle email sending failures gracefully
- [ ] Add email preferences (opt-in/opt-out)

**Acceptance Criteria:**
- ✅ Emails send successfully via SES
- ✅ Templates render correctly
- ✅ Users receive notifications for key events
- ✅ Failed sends logged to Sentry

---

### Issue #35: Recipe Duplication Feature

**Labels:** `recipes`, `enhancement`
**Milestone:** Future Enhancements
**Estimated Effort:** 4 hours
**Dependencies:** #18

**Description:**
Allow users to duplicate existing recipes as a starting point for new recipes.

**Tasks:**
- [ ] Add "Duplicate Recipe" button to recipe detail page
- [ ] Create API endpoint: `POST /api/recipes/[id]/duplicate`
- [ ] Copy recipe with all sections and ingredients
- [ ] Append "(Copy)" to recipe name
- [ ] Redirect to edit page of duplicated recipe
- [ ] Test duplication accuracy

**Acceptance Criteria:**
- ✅ Users can duplicate recipes
- ✅ All sections and ingredients copied
- ✅ Duplicated recipe editable independently

---

### Issue #36: Export Data to CSV Feature

**Labels:** `export`, `enhancement`
**Milestone:** Future Enhancements
**Estimated Effort:** 6 hours
**Dependencies:** Various features

**Description:**
Allow users to export data to CSV for external analysis.

**Tasks:**
- [ ] Add export buttons to list pages:
  - Recipes
  - Ingredients
  - Inventory transactions
  - Vendors
  - Equipment
  - Bake sheets
- [ ] Create CSV generation utility
- [ ] Create API endpoints for exports
- [ ] Test CSV format and data accuracy
- [ ] Add permission checks (export.data)

**Acceptance Criteria:**
- ✅ Users can export lists to CSV
- ✅ CSV format correct and importable in spreadsheet apps
- ✅ Permission checks enforced

---

## Summary

### Total Issues: 36
- Phase 1 (Foundation): 10 issues
- Phase 2 (Platform Admin): 6 issues
- Phase 3 (Core Features): 5 issues
- Phase 4 (Advanced Features): 4 issues
- Phase 5 (Polish): 8 issues
- Optional Enhancements: 3 issues

### Priority Distribution
- **Critical:** 11 issues
- **High:** 12 issues
- **Medium:** 10 issues
- **Low:** 1 issue
- **Enhancement:** 3 issues

### Estimated Total Effort
- **Phase 1:** ~45 hours (1-2 weeks with 2-3 developers)
- **Phase 2:** ~43 hours (1 week with 2 developers)
- **Phase 3:** ~44 hours (1-2 weeks with 2-3 developers)
- **Phase 4:** ~38 hours (1 week with 2-3 developers)
- **Phase 5:** ~48 hours (1 week with 2-3 developers)
- **Total:** ~218 hours (~6 weeks with 3-4 developers)

### Parallel Work Recommendations

**Week 1:**
- #1, #2, #3 (can run in parallel with different devs)
- #4, #5 (can run in parallel)
- #6, #7 (can run in parallel)
- #8, #9, #10 (can run toward end of week)

**Week 2:**
- #11, #12 (sequential)
- #13, #14, #15, #16 (some can parallel)
- Start #17 (role system)

**Week 3-4:**
- #17 (complete role system)
- #18, #19, #20, #21 (all can run in parallel - different features)

**Week 4-5:**
- #22, #23, #24, #25 (some can parallel)

**Week 6:**
- #26, #27, #28, #29, #30, #31 (UI/UX polish - can parallel)
- #32, #33 (documentation and deployment)

---

## Next Steps

1. **Create GitHub repository:** `daily-baker`
2. **Create GitHub milestones:** Phase 1-5
3. **Create issues from this document** (copy each section into GitHub)
4. **Apply labels and milestones** to all issues
5. **Setup GitHub project board** with columns: Backlog, To Do, In Progress, Review, Done
6. **Assign issues** to team members based on expertise and availability
7. **Begin Phase 1 implementation**
