import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Capture Replay for 10% of all sessions,
  // plus 100% of sessions with an error
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,

  // You can remove this option if you're not planning to use the Sentry Session Replay feature:
  integrations: [
    Sentry.replayIntegration({
      // Additional Replay configuration goes in here, for example:
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Filter out noise from error tracking
  beforeSend(event, hint) {
    // Don't send errors in development
    if (process.env.NODE_ENV !== 'production') {
      return null;
    }

    // Filter out common browser errors that aren't actionable
    const error = hint.originalException;
    if (error && typeof error === 'object' && 'message' in error) {
      const message = error.message as string;

      // Network errors
      if (message.includes('Network request failed')) return null;
      if (message.includes('Failed to fetch')) return null;

      // Extension errors
      if (message.includes('chrome-extension://')) return null;
      if (message.includes('moz-extension://')) return null;

      // ResizeObserver errors (common false positive)
      if (message.includes('ResizeObserver')) return null;
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
    },
  },
});
