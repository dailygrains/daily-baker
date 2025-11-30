/* eslint-disable @typescript-eslint/no-unused-vars */
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Filter out noise from error tracking
  beforeSend(event, _hint) {
    // Don't send errors in development
    if (process.env.NODE_ENV !== 'production') {
      return null;
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
      runtime: 'edge',
    },
  },
});
