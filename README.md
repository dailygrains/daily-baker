# Daily Baker

**Production-ready multi-tenant bakery operations management system**

Built with Next.js 15, PostgreSQL, and Clerk authentication, deployed on Vercel.

---

## Overview

Daily Baker is an internal operations management tool designed for small microbakeries. It helps bakery owners and staff manage:

- **Recipes** - Multi-step formulations with sections (poolish, dough, final mix)
- **Ingredients** - Inventory with vendor linkage and cost tracking
- **Inventory** - Transaction-based tracking (receive, use, adjust, waste)
- **Vendors** - Supplier contact information and relationships
- **Bake Sheets** - Production planning and execution tracking
- **Equipment** - Asset management with status workflow

### Multi-Tenant Architecture

- Multiple bakery organizations supported
- Data isolation per bakery
- **Two-tier role-based access control:**
  - **Platform admins** - Manage entire application and all bakeries
  - **Bakery admins** - Manage individual bakery data with dynamic roles

---

## Tech Stack

### Frontend
- **Next.js 15** with App Router
- **React 19**
- **TypeScript** (strict mode)
- **Tailwind CSS v4** + **DaisyUI**
- **MDX Editor** (rich text for recipe instructions)

### Backend & Database
- **PostgreSQL** (primary database)
- **Prisma ORM** (type-safe database client)
- **Next.js API Routes** (REST endpoints)

### Authentication & Authorization
- **Clerk** (user authentication with OAuth + email/password)
- **Custom two-tier permission system:**
  - Platform-level permissions (super-admin)
  - Dynamic bakery-level roles and permissions

### Integration & Services
- **AWS S3** (file storage for uploads in MDX editor)
- **AWS SES** (transactional emails)

### Infrastructure & Monitoring
- **Vercel** (hosting, CI/CD, preview deployments)
- **Sentry** (error tracking and performance monitoring)

---

## Features

### Platform Admin Features
- Bakery management (create, edit, soft delete bakeries)
- Cross-tenant user management
- User-to-bakery assignment
- Platform admin promotion
- Platform-wide analytics
- Audit logging for admin actions

### Bakery Features
- **Recipes:** Multi-step recipes with rich MDX instructions
- **Ingredients:** Catalog with current quantity and cost per unit
- **Inventory:** Transaction-based tracking (RECEIVE, USE, ADJUST, WASTE)
- **Vendors:** Supplier management with contacts
- **Equipment:** Asset tracking with status workflow
- **Bake Sheets:** Production planning with automatic inventory deduction
- **Dynamic Roles:** Bakery admins can create custom roles and permissions

### Advanced Features
- **MDX Rich Text Editor** for recipe instructions (with S3 image uploads)
- **Unit Conversion System** (metric ↔ imperial)
- **Recipe Costing** (auto-calculated from ingredients)
- **Automatic Inventory Deduction** (when bake sheets completed)

---

## Project Status

🚧 **In Development** 🚧

**Current Phase:** Foundation (Phase 1)

See [GitHub Issues](https://github.com/YOUR_USERNAME/daily-baker/issues) for current progress.

---

## Development Setup

### Prerequisites

- **Node.js** 20.x or higher
- **PostgreSQL** (local or hosted)
- **npm** package manager
- **Clerk account** (for authentication)
- **AWS account** (for S3 and SES)
- **Vercel account** (for deployment)

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/daily-baker.git
cd daily-baker

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.development
# Edit .env.development with your credentials

# Setup database
npm run db:migrate      # Apply migrations
npm run db:seed         # Populate test data

# Start development server
npm run dev
```

The app will be available at http://localhost:3000

### Environment Variables

See `.env.example` for required environment variables:

- `DATABASE_URL` - PostgreSQL connection string
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk publishable key
- `CLERK_SECRET_KEY` - Clerk secret key
- `AWS_REGION` - AWS region
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `AWS_S3_BUCKET_NAME` - S3 bucket name
- `AWS_SES_FROM_EMAIL` - SES verified sender email
- `PLATFORM_ADMIN_EMAIL` - Your email (for platform admin seeding)
- `SENTRY_DSN` - Sentry error tracking DSN (optional)

### Database Workflow

**NEVER deviate from this workflow:**

1. Edit `prisma/schema.prisma`
2. Create migration: `npm run db:migrate`
3. Review migration in `prisma/migrations/`
4. Test locally
5. Commit schema + migration files together
6. Deploy (migrations run automatically on Vercel)

**Available Commands:**

```bash
npm run db:generate        # Generate Prisma Client
npm run db:migrate         # Create + apply migration
npm run db:migrate:reset   # Reset database
npm run db:seed            # Populate test data
npm run db:studio          # Browse database (Prisma Studio)
```

---

## Development Commands

```bash
# Development
npm run dev              # Start dev server (localhost:3000)
npm run dev:lint         # Start dev server with real-time linting
npm run build            # Production build
npm run start            # Start production server
npm run lint             # Run ESLint
npm run lint:fix         # Auto-fix ESLint issues
npm run type-check       # TypeScript type checking

# Database
npm run db:generate      # Generate Prisma Client
npm run db:migrate       # Create and apply migration
npm run db:studio        # Open Prisma Studio
npm run db:seed          # Populate test data
```

---

## Project Structure

```
daily-baker/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   │   ├── admin/         # Platform admin APIs
│   │   │   ├── recipes/       # Recipe CRUD
│   │   │   ├── ingredients/   # Ingredient management
│   │   │   ├── inventory/     # Inventory transactions
│   │   │   ├── vendors/       # Vendor management
│   │   │   ├── equipment/     # Equipment tracking
│   │   │   ├── bake-sheets/   # Bake sheet operations
│   │   │   └── roles/         # Dynamic role management
│   │   ├── (dashboard)/       # Main app pages
│   │   └── admin/             # Platform admin section
│   ├── components/            # Reusable React components
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Utility libraries
│   │   ├── prisma.ts         # Database client
│   │   ├── clerk.ts          # Clerk helpers
│   │   ├── permissions.ts    # Permission checking
│   │   ├── s3.ts             # S3 client
│   │   └── ses.ts            # SES client
│   └── types/                 # TypeScript definitions
├── prisma/
│   ├── schema.prisma         # Database schema
│   ├── migrations/           # Migration history
│   └── seed.ts              # Seed data
├── public/                   # Static assets
└── package.json             # Dependencies
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1) ✅
- Initialize Next.js project
- Configure Tailwind + DaisyUI
- Setup PostgreSQL + Prisma
- Implement Clerk authentication
- Configure AWS S3 + SES
- Deploy to Vercel
- Setup Sentry monitoring

### Phase 2: Platform Admin (Week 2) 🚧
- Platform admin authentication
- Bakery CRUD operations
- Cross-tenant user management
- Platform analytics
- Audit logging

### Phase 3: Core Features (Week 3-4) ⏳
- Dynamic role system
- Recipe management
- Ingredient catalog
- Vendor management
- Equipment tracking

### Phase 4: Advanced Features (Week 4-5) ⏳
- Inventory transactions
- Bake sheet management
- MDX editor integration
- Unit conversion system

### Phase 5: Polish & Production (Week 6) ⏳
- Responsive design
- Search & filtering
- Error handling
- Documentation
- Production deployment

---

## Contributing

This is an internal project. For team members:

1. Create a feature branch: `git checkout -b feature/issue-#-description`
2. Make your changes
3. Run tests: `npm run lint && npm run type-check`
4. Commit: `git commit -m "feat: add feature description"`
5. Push: `git push -u origin feature/issue-#-description`
6. Create Pull Request on GitHub
7. Request review from team member
8. Merge when approved

### Commit Convention

- `feat:` New feature
- `fix:` Bug fix
- `refactor:` Code refactoring
- `docs:` Documentation
- `chore:` Tooling/config changes
- `test:` Adding tests

---

## Documentation

- **Implementation Plan:** See project documentation for complete roadmap
- **GitHub Issues:** All features tracked as GitHub issues with acceptance criteria
- **Parallel Work Strategy:** Team coordination and parallelization guide
- **Quick Start Guide:** Step-by-step setup instructions

---

## Resources

### Official Documentation

- [Next.js](https://nextjs.org/docs)
- [Prisma](https://www.prisma.io/docs) (has [llms.txt](https://www.prisma.io/llms.txt)!)
- [Clerk](https://clerk.com/docs) (has [llms.txt](https://clerk.com/llms.txt)!)
- [DaisyUI](https://daisyui.com/docs) (has [llms.txt](https://daisyui.com/llms.txt)!)
- [Tailwind CSS](https://tailwindcss.com/docs)

### AI Resources

- [Clerk AI Prompts](https://clerk.com/docs/guides/development/ai-prompts)
- [Prisma AI Tools](https://www.prisma.io/docs/orm/more/ai-tools)
- [DaisyUI ChatGPT Setup](https://daisyui.com/docs/editor/chatgpt/)

### MCP Servers (for AI-assisted development)

- [Vercel MCP](https://vercel.com/docs/mcp/vercel-mcp)
- [Next.js DevTools MCP](https://github.com/vercel/next-devtools-mcp)
- [Clerk Agent Toolkit](https://github.com/clerk/javascript/tree/main/packages/agent-toolkit)

---

## License

Proprietary - Internal use only

---

## Support

For questions or issues:
- Create a GitHub issue
- Contact the development team
- Check the project documentation

---

Built with ❤️ for small bakeries 🥖🍞🥐
