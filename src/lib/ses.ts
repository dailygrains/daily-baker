import { SESClient, SendEmailCommand, VerifyEmailIdentityCommand } from '@aws-sdk/client-ses';

// Initialize SES client
export const sesClient = new SESClient({
  region: process.env.AWS_SES_REGION || process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const FROM_EMAIL = process.env.AWS_SES_FROM_EMAIL!;

/**
 * Send a plain text email
 */
export async function sendEmail(params: {
  to: string | string[];
  subject: string;
  body: string;
  from?: string;
}): Promise<void> {
  const { to, subject, body, from = FROM_EMAIL } = params;

  const command = new SendEmailCommand({
    Source: from,
    Destination: {
      ToAddresses: Array.isArray(to) ? to : [to],
    },
    Message: {
      Subject: {
        Data: subject,
        Charset: 'UTF-8',
      },
      Body: {
        Text: {
          Data: body,
          Charset: 'UTF-8',
        },
      },
    },
  });

  await sesClient.send(command);
}

/**
 * Send an HTML email
 */
export async function sendHtmlEmail(params: {
  to: string | string[];
  subject: string;
  html: string;
  textBody?: string;
  from?: string;
}): Promise<void> {
  const { to, subject, html, textBody, from = FROM_EMAIL } = params;

  const command = new SendEmailCommand({
    Source: from,
    Destination: {
      ToAddresses: Array.isArray(to) ? to : [to],
    },
    Message: {
      Subject: {
        Data: subject,
        Charset: 'UTF-8',
      },
      Body: {
        Html: {
          Data: html,
          Charset: 'UTF-8',
        },
        ...(textBody && {
          Text: {
            Data: textBody,
            Charset: 'UTF-8',
          },
        }),
      },
    },
  });

  await sesClient.send(command);
}

/**
 * Verify an email address for sending (required in sandbox mode)
 */
export async function verifyEmailAddress(email: string): Promise<void> {
  const command = new VerifyEmailIdentityCommand({
    EmailAddress: email,
  });

  await sesClient.send(command);
}

// ============================================================================
// Email Templates
// ============================================================================

/**
 * Send user invitation email
 */
export async function sendUserInvitation(params: {
  toEmail: string;
  toName: string;
  bakeryName: string;
  inviteUrl: string;
}): Promise<void> {
  const { toEmail, toName, bakeryName, inviteUrl } = params;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .button { display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Daily Baker</h1>
    </div>
    <div class="content">
      <h2>You've been invited!</h2>
      <p>Hi ${toName},</p>
      <p>You've been invited to join <strong>${bakeryName}</strong> on Daily Baker, a bakery operations management platform.</p>
      <p>Click the button below to accept your invitation and create your account:</p>
      <a href="${inviteUrl}" class="button">Accept Invitation</a>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all;">${inviteUrl}</p>
      <p>If you didn't expect this invitation, you can safely ignore this email.</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Daily Baker. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;

  const textBody = `
You've been invited to join ${bakeryName} on Daily Baker!

Hi ${toName},

You've been invited to join ${bakeryName} on Daily Baker, a bakery operations management platform.

Accept your invitation: ${inviteUrl}

If you didn't expect this invitation, you can safely ignore this email.

© ${new Date().getFullYear()} Daily Baker. All rights reserved.
  `;

  await sendHtmlEmail({
    to: toEmail,
    subject: `Invitation to join ${bakeryName} on Daily Baker`,
    html,
    textBody,
  });
}

/**
 * Send low stock alert
 */
export async function sendLowStockAlert(params: {
  toEmail: string;
  bakeryName: string;
  ingredientName: string;
  currentQuantity: number;
  unit: string;
}): Promise<void> {
  const { toEmail, bakeryName, ingredientName, currentQuantity, unit } = params;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #EF4444; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .alert { background-color: #FEE2E2; border-left: 4px solid #EF4444; padding: 12px; margin: 16px 0; }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ Low Stock Alert</h1>
    </div>
    <div class="content">
      <h2>Inventory Alert for ${bakeryName}</h2>
      <div class="alert">
        <strong>${ingredientName}</strong> is running low!
        <br>Current quantity: <strong>${currentQuantity} ${unit}</strong>
      </div>
      <p>Please consider reordering this ingredient soon to avoid running out.</p>
      <p>Log in to Daily Baker to update inventory or create a purchase order.</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Daily Baker. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;

  const textBody = `
⚠️ LOW STOCK ALERT

${bakeryName} - Inventory Alert

${ingredientName} is running low!
Current quantity: ${currentQuantity} ${unit}

Please consider reordering this ingredient soon to avoid running out.

Log in to Daily Baker to update inventory or create a purchase order.

© ${new Date().getFullYear()} Daily Baker. All rights reserved.
  `;

  await sendHtmlEmail({
    to: toEmail,
    subject: `Low Stock Alert: ${ingredientName}`,
    html,
    textBody,
  });
}

/**
 * Send bake sheet completion notification
 */
export async function sendBakeSheetCompleted(params: {
  toEmail: string;
  bakeryName: string;
  recipeName: string;
  quantity: string;
  completedBy: string;
}): Promise<void> {
  const { toEmail, bakeryName, recipeName, quantity, completedBy } = params;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #10B981; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .success { background-color: #D1FAE5; border-left: 4px solid #10B981; padding: 12px; margin: 16px 0; }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Bake Sheet Completed</h1>
    </div>
    <div class="content">
      <h2>${bakeryName} - Production Update</h2>
      <div class="success">
        <strong>${recipeName}</strong> has been completed!
        <br>Quantity: <strong>${quantity}</strong>
        <br>Completed by: ${completedBy}
      </div>
      <p>Inventory has been automatically updated with ingredient usage.</p>
      <p>Log in to Daily Baker to view updated inventory levels.</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Daily Baker. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;

  const textBody = `
✅ BAKE SHEET COMPLETED

${bakeryName} - Production Update

${recipeName} has been completed!
Quantity: ${quantity}
Completed by: ${completedBy}

Inventory has been automatically updated with ingredient usage.

Log in to Daily Baker to view updated inventory levels.

© ${new Date().getFullYear()} Daily Baker. All rights reserved.
  `;

  await sendHtmlEmail({
    to: toEmail,
    subject: `Bake Sheet Completed: ${recipeName}`,
    html,
    textBody,
  });
}

/**
 * Send platform admin notification
 */
export async function sendPlatformAdminAlert(params: {
  toEmail: string;
  subject: string;
  message: string;
  action?: string;
}): Promise<void> {
  const { toEmail, subject, message, action } = params;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #6366F1; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .info { background-color: #E0E7FF; border-left: 4px solid: #6366F1; padding: 12px; margin: 16px 0; }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔧 Platform Admin Alert</h1>
    </div>
    <div class="content">
      <h2>${subject}</h2>
      <div class="info">
        <p>${message}</p>
        ${action ? `<p><strong>Action:</strong> ${action}</p>` : ''}
      </div>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Daily Baker. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;

  const textBody = `
🔧 PLATFORM ADMIN ALERT

${subject}

${message}

${action ? `Action: ${action}` : ''}

© ${new Date().getFullYear()} Daily Baker. All rights reserved.
  `;

  await sendHtmlEmail({
    to: toEmail,
    subject: `[Platform Admin] ${subject}`,
    html,
    textBody,
  });
}
