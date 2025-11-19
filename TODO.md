# Daily Baker - Project TODO Tracker

**Last Updated:** 2025-01-18
**Current Phase:** Phase 1 - Foundation
**Status:** Ready to begin development

---

## How to Use This File

- **Status Indicators:** ⏳ Pending | 🚧 In Progress | ✅ Complete | ⚠️ Blocked
- **Priority:** 🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low
- **Can Run in Parallel:** 🔀 indicates tasks that can be done simultaneously

---

## Phase 1: Foundation (Week 1) - CURRENT PHASE

### Infrastructure Setup

- [ ] **#1: Initialize Next.js 15 Project** 🔴 🔀
  - Status: ⏳ Pending
  - Effort: 4 hours
  - Dependencies: None
  - Tasks:
    - [ ] Run create-next-app with TypeScript
    - [ ] Configure tsconfig.json
    - [ ] Install core dependencies (Prisma, Clerk, Tailwind, etc.)
    - [ ] Configure next.config.js
    - [ ] Setup npm scripts
    - [ ] Test dev server starts

- [ ] **#2: Configure Tailwind CSS v4 + DaisyUI** 🔴 🔀
  - Status: ⏳ Pending
  - Effort: 3 hours
  - Dependencies: #1
  - Tasks:
    - [ ] Install Tailwind v4 and DaisyUI
    - [ ] Configure tailwind.config.ts
    - [ ] Setup dark/light mode
    - [ ] Configure typography (Geist fonts)
    - [ ] Test responsive breakpoints

- [ ] **#3: Setup PostgreSQL + Prisma** 🔴 🔀
  - Status: ⏳ Pending
  - Effort: 6 hours
  - Dependencies: #1
  - Tasks:
    - [ ] Setup local PostgreSQL
    - [ ] Setup hosted PostgreSQL (Vercel/Supabase)
    - [ ] Install Prisma CLI
    - [ ] Configure DATABASE_URL
    - [ ] Create npm scripts (db:generate, db:migrate, etc.)
    - [ ] Test database connection

- [ ] **#4: Define Multi-Tenant Database Schema** 🔴
  - Status: ⏳ Pending
  - Effort: 8 hours
  - Dependencies: #3
  - Tasks:
    - [ ] Create Bakery model
    - [ ] Create User model with isPlatformAdmin
    - [ ] Create Role model (dynamic, bakery-scoped)
    - [ ] Create Recipe + RecipeSection models
    - [ ] Create Ingredient + InventoryTransaction models
    - [ ] Create Vendor + VendorContact models
    - [ ] Create Equipment model
    - [ ] Create BakeSheet model
    - [ ] Create UnitConversion model
    - [ ] Add indexes and constraints
    - [ ] Generate migration

- [ ] **#5: Configure Clerk Authentication** 🔴 🔀
  - Status: ⏳ Pending
  - Effort: 4 hours
  - Dependencies: #1
  - Tasks:
    - [ ] Create Clerk account/application
    - [ ] Configure OAuth providers (Google, GitHub)
    - [ ] Install @clerk/nextjs
    - [ ] Add Clerk environment variables
    - [ ] Wrap app with ClerkProvider
    - [ ] Create sign-in/sign-up pages
    - [ ] Test authentication flow

- [ ] **#6: Setup AWS S3** 🟠 🔀
  - Status: ⏳ Pending
  - Effort: 4 hours
  - Dependencies: #1
  - Tasks:
    - [ ] Create S3 bucket
    - [ ] Configure CORS policy
    - [ ] Setup IAM user with S3 permissions
    - [ ] Install AWS SDK packages
    - [ ] Create lib/s3.ts client
    - [ ] Add AWS environment variables
    - [ ] Test presigned URL generation

- [ ] **#7: Setup AWS SES** 🟡 🔀
  - Status: ⏳ Pending
  - Effort: 3 hours
  - Dependencies: #1
  - Tasks:
    - [ ] Enable AWS SES
    - [ ] Verify sender email
    - [ ] Install @aws-sdk/client-ses
    - [ ] Create lib/ses.ts client
    - [ ] Add SES environment variables
    - [ ] Test email sending

- [ ] **#8: Configure Vercel Deployment** 🟠
  - Status: ⏳ Pending
  - Effort: 3 hours
  - Dependencies: #1, #3, #5
  - Tasks:
    - [ ] Create Vercel project
    - [ ] Connect GitHub repo
    - [ ] Configure production env vars
    - [ ] Configure preview env vars
    - [ ] Enable automatic deployments
    - [ ] Test deployment pipeline

- [ ] **#9: Configure Sentry** 🟡
  - Status: ⏳ Pending
  - Effort: 3 hours
  - Dependencies: #1, #8
  - Tasks:
    - [ ] Create Sentry project
    - [ ] Install Sentry SDK
    - [ ] Create instrumentation files (client, server, edge)
    - [ ] Configure source maps upload
    - [ ] Test error capture

- [ ] **#10: Create Seed Data System** 🟠
  - Status: ⏳ Pending
  - Effort: 6 hours
  - Dependencies: #4
  - Tasks:
    - [ ] Create prisma/seed.ts
    - [ ] Create prisma/data/ directory
    - [ ] Create platform-admin.ts seeder
    - [ ] Create bakeries.ts seeder (2-3 sample bakeries)
    - [ ] Create users.ts + roles.ts seeders
    - [ ] Create recipes.ts seeder (5-10 recipes)
    - [ ] Create ingredients.ts seeder
    - [ ] Create vendors.ts seeder
    - [ ] Create equipment.ts seeder
    - [ ] Create conversions.ts seeder
    - [ ] Test seed script

**Phase 1 Deliverables:**
- ✅ Working Next.js app with auth
- ✅ Database schema deployed
- ✅ Vercel staging environment
- ✅ Platform admin account seeded

---

## Phase 2: Platform Admin (Week 2)

### Platform Admin Features

- [ ] **#11: Platform Admin Auth Flow** 🔴
  - Status: ⏳ Pending
  - Effort: 4 hours
  - Dependencies: #5, #4
  - Tasks:
    - [ ] Create middleware for platform admin check
    - [ ] Create /admin route protection
    - [ ] Create checkPlatformPermission helper
    - [ ] Redirect non-admins from /admin
    - [ ] Test with platform admin and regular users

- [ ] **#12: Platform Admin Dashboard Layout** 🟠
  - Status: ⏳ Pending
  - Effort: 6 hours
  - Dependencies: #11, #2
  - Tasks:
    - [ ] Create /app/admin/layout.tsx
    - [ ] Design admin dashboard home page
    - [ ] Create admin navigation sidebar
    - [ ] Use distinct color scheme
    - [ ] Create dashboard metric cards
    - [ ] Make responsive

- [ ] **#13: Bakery CRUD Operations** 🔴 🔀
  - Status: ⏳ Pending
  - Effort: 8 hours
  - Dependencies: #11, #12
  - Tasks:
    - [ ] Backend: Create API routes (POST, GET, PATCH, DELETE)
    - [ ] Backend: Add validation with Zod
    - [ ] Backend: Implement permission checks
    - [ ] Backend: Add audit logging
    - [ ] Frontend: Create bakery list view
    - [ ] Frontend: Create bakery forms (new/edit)
    - [ ] Frontend: Add search/filter
    - [ ] Frontend: Add confirmation modals

- [ ] **#14: Cross-Tenant User Management** 🟠 🔀
  - Status: ⏳ Pending
  - Effort: 10 hours
  - Dependencies: #11, #12, #13
  - Tasks:
    - [ ] Backend: Create user management APIs
    - [ ] Backend: Add filters and sorting
    - [ ] Backend: Implement user-to-bakery assignment
    - [ ] Backend: Implement platform admin promotion
    - [ ] Backend: Add audit logging
    - [ ] Frontend: Create user list view
    - [ ] Frontend: Create user detail view
    - [ ] Frontend: Add search/filter UI
    - [ ] Frontend: Create assignment modals
    - [ ] Email: Send notifications (SES)

- [ ] **#15: Platform Analytics Dashboard** 🟡
  - Status: ⏳ Pending
  - Effort: 6 hours
  - Dependencies: #12, #13, #14
  - Tasks:
    - [ ] Backend: Create analytics API
    - [ ] Backend: Aggregate cross-tenant metrics
    - [ ] Backend: Add caching
    - [ ] Frontend: Create analytics page
    - [ ] Frontend: Design metric cards
    - [ ] Frontend: Make responsive

- [ ] **#16: Audit Logging System** 🟠
  - Status: ⏳ Pending
  - Effort: 5 hours
  - Dependencies: #13, #14
  - Tasks:
    - [ ] Create AuditLog Prisma model
    - [ ] Create migration
    - [ ] Create audit logging utility
    - [ ] Log platform admin actions
    - [ ] Create audit log API
    - [ ] Create frontend audit log view
    - [ ] Add filtering

**Phase 2 Deliverables:**
- ✅ Platform admin dashboard functional
- ✅ Bakery management complete
- ✅ User management working
- ✅ Role system foundation ready

---

## Phase 3: Core Bakery Features (Week 3-4)

### Dynamic Roles & Core Features

- [ ] **#17: Dynamic Role System** 🔴 🔀
  - Status: ⏳ Pending
  - Effort: 10 hours
  - Dependencies: #4, #5
  - Tasks:
    - [ ] Backend: Create role API routes
    - [ ] Backend: Implement checkBakeryPermission helper
    - [ ] Backend: Create permission middleware
    - [ ] Backend: Add bakery-scoping
    - [ ] Frontend: Create role list/detail pages
    - [ ] Frontend: Create permission matrix component
    - [ ] Frontend: Add role templates
    - [ ] Test permission checking

- [ ] **#18: Recipe Management** 🟠 🔀
  - Status: ⏳ Pending
  - Effort: 12 hours
  - Dependencies: #4, #17
  - Tasks:
    - [ ] Backend: Create recipe API routes
    - [ ] Backend: Implement costing calculation
    - [ ] Backend: Add permission checks
    - [ ] Frontend: Create recipe list page
    - [ ] Frontend: Create recipe detail/edit pages
    - [ ] Frontend: Create section management UI
    - [ ] Frontend: Create ingredient selector
    - [ ] Frontend: Display cost breakdown
    - [ ] Frontend: Add search/filter

- [ ] **#19: Ingredient Catalog** 🟠 🔀
  - Status: ⏳ Pending
  - Effort: 8 hours
  - Dependencies: #4, #17
  - Tasks:
    - [ ] Backend: Create ingredient API routes
    - [ ] Backend: Add validation
    - [ ] Backend: Add permission checks
    - [ ] Frontend: Create ingredient list page
    - [ ] Frontend: Create ingredient forms
    - [ ] Frontend: Add search/filter
    - [ ] Frontend: Display vendor linkage
    - [ ] Frontend: Add low stock indicator

- [ ] **#20: Vendor Management** 🟡 🔀
  - Status: ⏳ Pending
  - Effort: 6 hours
  - Dependencies: #4, #17
  - Tasks:
    - [ ] Backend: Create vendor API routes
    - [ ] Backend: Add contact management
    - [ ] Backend: Add validation
    - [ ] Frontend: Create vendor list page
    - [ ] Frontend: Create vendor forms
    - [ ] Frontend: Create contact management UI
    - [ ] Frontend: Display linked items
    - [ ] Frontend: Add search

- [ ] **#21: Equipment Tracking** 🟡 🔀
  - Status: ⏳ Pending
  - Effort: 8 hours
  - Dependencies: #4, #17, #20
  - Tasks:
    - [ ] Backend: Create equipment API routes
    - [ ] Backend: Implement status workflow
    - [ ] Backend: Add validation
    - [ ] Frontend: Create equipment list page
    - [ ] Frontend: Create equipment forms
    - [ ] Frontend: Add status change UI
    - [ ] Frontend: Filter by status
    - [ ] Frontend: Add search

**Phase 3 Deliverables:**
- ✅ Multi-step recipe management
- ✅ Ingredient catalog with costs
- ✅ Vendor management
- ✅ Equipment tracking

---

## Phase 4: Advanced Features (Week 4-5)

### Inventory & Production

- [ ] **#22: Transaction-Based Inventory** 🟠 🔀
  - Status: ⏳ Pending
  - Effort: 10 hours
  - Dependencies: #19
  - Tasks:
    - [ ] Backend: Create inventory transaction APIs
    - [ ] Backend: Implement transaction types (RECEIVE, USE, ADJUST, WASTE)
    - [ ] Backend: Update ingredient quantities
    - [ ] Backend: Add validation (no negative inventory)
    - [ ] Frontend: Create inventory overview page
    - [ ] Frontend: Create transaction history view
    - [ ] Frontend: Create quick action modals
    - [ ] Frontend: Add filtering

- [ ] **#23: Bake Sheet Management** 🟠 🔀
  - Status: ⏳ Pending
  - Effort: 12 hours
  - Dependencies: #18, #22
  - Tasks:
    - [ ] Backend: Create bake sheet APIs
    - [ ] Backend: Implement completion workflow
    - [ ] Backend: Calculate ingredient quantities (recipe × scale)
    - [ ] Backend: Create USE transactions on completion
    - [ ] Backend: Handle unit conversions
    - [ ] Frontend: Create bake sheet list page
    - [ ] Frontend: Create bake sheet forms
    - [ ] Frontend: Display calculated quantities
    - [ ] Frontend: Add "Mark Completed" button
    - [ ] Frontend: Display cost calculations

- [ ] **#24: MDX Editor Integration** 🟠
  - Status: ⏳ Pending
  - Effort: 10 hours
  - Dependencies: #6, #18
  - Tasks:
    - [ ] Backend: Create presigned URL API
    - [ ] Backend: Validate file type/size
    - [ ] Frontend: Create MDXEditor component
    - [ ] Frontend: Configure plugins (table, code, image)
    - [ ] Frontend: Implement image upload flow
    - [ ] Frontend: Add to recipe instruction editor
    - [ ] Frontend: Test markdown rendering
    - [ ] Frontend: Apply styling

- [ ] **#25: Unit Conversion System** 🟡
  - Status: ⏳ Pending
  - Effort: 6 hours
  - Dependencies: #4, #19, #23
  - Tasks:
    - [ ] Seed UnitConversion table
    - [ ] Create convertUnits utility
    - [ ] Create conversion management API
    - [ ] Apply conversions in inventory logic
    - [ ] Apply conversions in recipe costing
    - [ ] Frontend: Create conversion management UI (admin)
    - [ ] Test conversion accuracy

**Phase 4 Deliverables:**
- ✅ Transaction-based inventory
- ✅ Bake sheets with auto deduction
- ✅ Rich text editor with uploads
- ✅ Unit conversion working

---

## Phase 5: Polish & Production (Week 6)

### UI/UX Polish

- [ ] **#26: Collapsible Sidebar Navigation** 🟠
  - Status: ⏳ Pending
  - Effort: 8 hours
  - Dependencies: #2
  - Tasks:
    - [ ] Create Sidebar component
    - [ ] Implement toggle functionality
    - [ ] Persist sidebar state
    - [ ] Add navigation sections
    - [ ] Add Platform Admin section (conditional)
    - [ ] Make responsive (desktop/tablet/mobile)
    - [ ] Add active route highlighting
    - [ ] Add icons

- [ ] **#27: Search & Filtering** 🟡 🔀
  - Status: ⏳ Pending
  - Effort: 6 hours
  - Dependencies: #18, #19, #20, #21, #23
  - Tasks:
    - [ ] Create reusable search component
    - [ ] Create filter dropdown component
    - [ ] Add to recipes page
    - [ ] Add to ingredients page
    - [ ] Add to vendors page
    - [ ] Add to equipment page
    - [ ] Add to bake sheets page
    - [ ] Add to admin pages
    - [ ] Implement debouncing

- [ ] **#28: Toast Notifications** 🟡
  - Status: ⏳ Pending
  - Effort: 4 hours
  - Dependencies: #2
  - Tasks:
    - [ ] Install toast library
    - [ ] Configure toast provider
    - [ ] Style toasts
    - [ ] Add success toasts
    - [ ] Add error toasts
    - [ ] Add loading toasts
    - [ ] Test across features

- [ ] **#29: Loading States & Skeletons** 🟢
  - Status: ⏳ Pending
  - Effort: 4 hours
  - Dependencies: All feature issues
  - Tasks:
    - [ ] Create skeleton components
    - [ ] Add loading states to all pages
    - [ ] Use React Suspense
    - [ ] Add loading spinners to buttons
    - [ ] Test with slow network

- [ ] **#30: Error Boundaries & Pages** 🟡
  - Status: ⏳ Pending
  - Effort: 4 hours
  - Dependencies: #9
  - Tasks:
    - [ ] Create error boundary component
    - [ ] Create app/error.tsx
    - [ ] Create app/not-found.tsx
    - [ ] Create API error handling
    - [ ] Add user-friendly messages
    - [ ] Log errors to Sentry
    - [ ] Test error scenarios

- [ ] **#31: Responsive Design Optimization** 🟠
  - Status: ⏳ Pending
  - Effort: 8 hours
  - Dependencies: All UI components
  - Tasks:
    - [ ] Test all pages on mobile (320px-767px)
    - [ ] Test all pages on tablet (768px-1023px)
    - [ ] Test all pages on desktop (1024px+)
    - [ ] Fix layout issues
    - [ ] Optimize forms for mobile
    - [ ] Test with DevTools device emulation
    - [ ] Test on real devices

- [ ] **#32: Documentation** 🟡
  - Status: ⏳ Pending
  - Effort: 6 hours
  - Dependencies: All features complete
  - Tasks:
    - [ ] Update README.md
    - [ ] Create CONTRIBUTING.md
    - [ ] Create docs/DATABASE.md
    - [ ] Create docs/DEPLOYMENT.md
    - [ ] Create docs/ARCHITECTURE.md
    - [ ] Create user guide (optional)

- [ ] **#33: Production Deployment** 🔴
  - Status: ⏳ Pending
  - Effort: 8 hours
  - Dependencies: All features complete, #8, #32
  - Tasks:
    - [ ] Review production env vars
    - [ ] Test production build
    - [ ] Run seed in production
    - [ ] Verify Sentry works
    - [ ] Test email sending
    - [ ] Test S3 uploads
    - [ ] End-to-end testing
    - [ ] Performance audit (Lighthouse)
    - [ ] Security audit
    - [ ] Document production URLs

**Phase 5 Deliverables:**
- ✅ All UI polished
- ✅ Fully responsive
- ✅ Comprehensive testing
- ✅ Production deployed
- ✅ Documentation complete

---

## Optional Enhancements (Future)

- [ ] **#34: Email Notifications (SES)** 🟢
  - Status: ⏳ Pending
  - Effort: 6 hours
  - Dependencies: #7

- [ ] **#35: Recipe Duplication** 🟢
  - Status: ⏳ Pending
  - Effort: 4 hours
  - Dependencies: #18

- [ ] **#36: Export to CSV** 🟢
  - Status: ⏳ Pending
  - Effort: 6 hours
  - Dependencies: Various features

---

## Current Sprint (Week 1 - Phase 1)

### This Week's Focus
Priority items to complete this week:

1. 🔴 #1: Initialize Next.js Project (START HERE)
2. 🔴 #2: Configure Tailwind + DaisyUI
3. 🔴 #3: Setup PostgreSQL + Prisma
4. 🔴 #4: Define Database Schema
5. 🔴 #5: Configure Clerk Auth
6. 🟠 #6: Setup AWS S3
7. 🟡 #7: Setup AWS SES
8. 🟠 #8: Configure Vercel
9. 🟡 #9: Configure Sentry
10. 🟠 #10: Create Seed Data

### Parallel Work Opportunities (if team available)
- **Dev A:** #1 → #3 → #4
- **Dev B:** #2 → #26 (start sidebar)
- **Dev C:** #6 → #7 → #8
- **Dev D:** #10 (after #4 complete)

---

## Progress Tracking

### Overall Progress
- **Total Issues:** 36 (33 core + 3 optional)
- **Completed:** 0
- **In Progress:** 0
- **Pending:** 36
- **Blocked:** 0

### By Phase
- **Phase 1:** 0/10 complete (0%)
- **Phase 2:** 0/6 complete (0%)
- **Phase 3:** 0/5 complete (0%)
- **Phase 4:** 0/4 complete (0%)
- **Phase 5:** 0/8 complete (0%)

### By Priority
- **Critical (🔴):** 0/11 complete
- **High (🟠):** 0/12 complete
- **Medium (🟡):** 0/10 complete
- **Low (🟢):** 0/3 complete

---

## Notes

### Blockers
- None currently

### Risks
- MDX editor Next.js 15 integration complexity
- Multi-tenancy data isolation requires careful testing
- Prisma migration conflicts if multiple devs on schema

### Decisions Made
- Using dailygrains GitHub organization
- PostgreSQL for database (not MySQL/MongoDB)
- Clerk for auth (not NextAuth)
- DaisyUI for components (not shadcn/ui)
- Two-tier permission system (platform + bakery)

### Key Dependencies to Remember
- Bake sheets (#23) needs recipes (#18) AND inventory (#22)
- MDX editor (#24) needs S3 (#6) AND recipes (#18)
- Most features need role system (#17) for permissions
- Platform admin features (#11-16) are independent from bakery features

---

**Last Updated:** 2025-01-18
**Next Update:** After completing Phase 1 issues
