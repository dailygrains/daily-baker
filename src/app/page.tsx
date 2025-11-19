import { SignInButton, SignUpButton } from '@clerk/nextjs';
import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { Wheat, BookOpen, Package, BarChart3 } from 'lucide-react';

export default async function Home() {
  const user = await currentUser();

  // Redirect authenticated users to dashboard
  if (user) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-base-100">
      {/* Header */}
      <div className="navbar bg-base-200 shadow-lg">
        <div className="flex-1">
          <a className="btn btn-ghost text-xl">
            <Wheat className="h-6 w-6 mr-2" />
            Daily Baker
          </a>
        </div>
        <div className="flex-none gap-2">
          <SignInButton mode="redirect" redirectUrl="/dashboard">
            <button className="btn btn-ghost">Sign In</button>
          </SignInButton>
          <SignUpButton mode="redirect" redirectUrl="/dashboard">
            <button className="btn btn-primary">Get Started</button>
          </SignUpButton>
        </div>
      </div>

      {/* Hero Section */}
      <div className="hero min-h-[60vh] bg-base-200">
        <div className="hero-content text-center">
          <div className="max-w-3xl">
            <h1 className="text-5xl font-bold mb-6">
              Bakery Operations, Simplified
            </h1>
            <p className="text-xl mb-8 text-base-content/70">
              Daily Baker is a modern, multi-tenant bakery management platform.
              Manage recipes, track inventory, schedule production, and streamline your bakery operations.
            </p>
            <div className="flex gap-4 justify-center">
              <SignUpButton mode="redirect" redirectUrl="/dashboard">
                <button className="btn btn-primary btn-lg">
                  Start Free Trial
                </button>
              </SignUpButton>
              <SignInButton mode="redirect" redirectUrl="/dashboard">
                <button className="btn btn-outline btn-lg">
                  Sign In
                </button>
              </SignInButton>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Everything Your Bakery Needs</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="card bg-base-200">
            <div className="card-body items-center text-center">
              <div className="bg-primary rounded-full p-4 mb-4">
                <BookOpen className="h-8 w-8 text-primary-content" />
              </div>
              <h3 className="card-title">Recipe Management</h3>
              <p className="text-base-content/70">
                Create and organize recipes with multi-step instructions, ingredient lists, and scaling capabilities.
              </p>
            </div>
          </div>

          <div className="card bg-base-200">
            <div className="card-body items-center text-center">
              <div className="bg-secondary rounded-full p-4 mb-4">
                <Package className="h-8 w-8 text-secondary-content" />
              </div>
              <h3 className="card-title">Inventory Tracking</h3>
              <p className="text-base-content/70">
                Monitor ingredient levels, track purchases and usage, get low stock alerts automatically.
              </p>
            </div>
          </div>

          <div className="card bg-base-200">
            <div className="card-body items-center text-center">
              <div className="bg-accent rounded-full p-4 mb-4">
                <BarChart3 className="h-8 w-8 text-accent-content" />
              </div>
              <h3 className="card-title">Production Planning</h3>
              <p className="text-base-content/70">
                Schedule bake sheets, assign tasks to team members, and track production completion.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-primary text-primary-content py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl mb-8 opacity-90">
            Join bakeries already using Daily Baker to streamline their operations.
          </p>
          <SignUpButton mode="redirect" redirectUrl="/dashboard">
            <button className="btn btn-secondary btn-lg">
              Create Your Account
            </button>
          </SignUpButton>
        </div>
      </div>

      {/* Footer */}
      <footer className="footer footer-center p-10 bg-base-200 text-base-content">
        <aside>
          <Wheat className="h-12 w-12" />
          <p className="font-bold text-lg">Daily Baker</p>
          <p className="text-sm text-base-content/60">Modern Bakery Operations Management</p>
          <p className="text-xs text-base-content/40">© 2025 Daily Baker. All rights reserved.</p>
        </aside>
      </footer>
    </div>
  );
}
