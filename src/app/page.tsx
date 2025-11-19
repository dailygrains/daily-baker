import { SignInButton, SignUpButton, UserButton } from '@clerk/nextjs';
import { currentUser } from '@clerk/nextjs/server';

export default async function Home() {
  const user = await currentUser();

  return (
    <div className="min-h-screen bg-base-100">
      {/* Header with Auth */}
      <div className="navbar bg-base-200 shadow-lg">
        <div className="flex-1">
          <a className="btn btn-ghost text-xl">Daily Baker</a>
        </div>
        <div className="flex-none gap-2">
          {user ? (
            <UserButton />
          ) : (
            <>
              <SignInButton mode="modal">
                <button className="btn btn-ghost">Sign In</button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="btn btn-primary">Sign Up</button>
              </SignUpButton>
            </>
          )}
        </div>
      </div>

      <div className="container mx-auto p-8">
        <h1 className="text-4xl font-bold mb-4 text-base-content">
          Daily Baker
        </h1>
        <p className="text-lg mb-8 text-base-content/70">
          Production-ready multi-tenant bakery operations management system
        </p>

        {user && (
          <div className="alert alert-success mb-8">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Welcome back, {user.firstName || user.emailAddresses[0]?.emailAddress}!</span>
          </div>
        )}

        {/* Test DaisyUI Components */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="card bg-base-200 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Recipes</h2>
              <p>Multi-step recipe management</p>
              <div className="card-actions justify-end">
                <button className="btn btn-primary">View Recipes</button>
              </div>
            </div>
          </div>

          <div className="card bg-base-200 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Inventory</h2>
              <p>Transaction-based tracking</p>
              <div className="card-actions justify-end">
                <button className="btn btn-secondary">View Inventory</button>
              </div>
            </div>
          </div>

          <div className="card bg-base-200 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Bake Sheets</h2>
              <p>Production planning</p>
              <div className="card-actions justify-end">
                <button className="btn btn-accent">View Bake Sheets</button>
              </div>
            </div>
          </div>
        </div>

        {/* Test Dark Mode Toggle */}
        <div className="mt-8">
          <div className="alert alert-info">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>Authentication configured! DaisyUI + Tailwind CSS v4 working. Clerk ready for setup.</span>
          </div>
        </div>

        {/* Responsive Test */}
        <div className="mt-8">
          <div className="stats shadow w-full">
            <div className="stat">
              <div className="stat-title">Total Recipes</div>
              <div className="stat-value">0</div>
              <div className="stat-desc">Ready to add recipes</div>
            </div>
            <div className="stat">
              <div className="stat-title">Total Bakeries</div>
              <div className="stat-value">0</div>
              <div className="stat-desc">Multi-tenant ready</div>
            </div>
            <div className="stat">
              <div className="stat-title">Platform Status</div>
              <div className="stat-value text-success">Active</div>
              <div className="stat-desc">All systems operational</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
