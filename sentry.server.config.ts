import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Filter out noise from error tracking
  beforeSend(event, hint) {
    // Don't send errors in development
    if (process.env.NODE_ENV !== 'production') {
      return null;
    }

    // Filter out common database errors that are expected
    const error = hint.originalException;
    if (error && typeof error === 'object' && 'message' in error) {
      const message = error.message as string;

      // Prisma connection errors during cold starts
      if (message.includes('Can\'t reach database server')) return null;

      // Expected validation errors (use custom error handling instead)
      if (message.includes('Validation error')) return null;
    }

    return event;
  },

  // Environment-specific configuration
  environment: process.env.NODE_ENV,

  // Release tracking (set by Vercel automatically)
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

  // Tag events with deployment info
  initialScope: {
    tags: {
      deploymentId: process.env.NEXT_PUBLIC_VERCEL_DEPLOYMENT_ID,
      environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV,
      runtime: 'node',
    },
  },

  // Integrate with Prisma for better error tracking
  integrations: [
    // Add custom integrations if needed
  ],
});
