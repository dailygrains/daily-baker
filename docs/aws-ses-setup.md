# AWS SES (Simple Email Service) Setup Guide

This guide walks you through setting up Amazon SES for transactional email in Daily Baker.

## Purpose

AWS SES is used for sending:
- User invitation emails
- Low stock inventory alerts
- Bake sheet completion notifications
- Platform admin notifications
- Password reset emails (via Clerk)
- General transactional emails

---

## Prerequisites

- AWS Account (same account used for S3)
- Daily Baker repository set up
- AWS credentials from S3 setup (can reuse same IAM user)

---

## 1. Understanding SES Sandbox Mode

### What is Sandbox Mode?

When you first create an AWS account, SES starts in **Sandbox Mode**:

**Restrictions**:
- Can only send TO verified email addresses
- Can only send FROM verified email addresses
- Limited to 200 emails per 24-hour period
- Maximum send rate of 1 email per second

**Perfect for**:
- Development and testing
- Small bakery operations (under 200 emails/day)
- Proof of concept

### Production Access

To send to any email address, you need to request **Production Access**:
- Submit a request to AWS (usually approved in 24 hours)
- Explain your use case (bakery operations management)
- Provide website URL
- Describe bounce/complaint handling

**Note**: For initial development, Sandbox Mode is sufficient.

---

## 2. Access AWS SES Console

### Step 1: Navigate to SES

1. Sign in to AWS Console: https://console.aws.amazon.com
2. Go to SES Console: https://console.aws.amazon.com/ses/
3. **Select your region** (top-right dropdown)
   - Choose the same region as your S3 bucket
   - Common: `us-east-1` (N. Virginia)

**Important**: SES configuration is region-specific. Stick to one region.

---

## 3. Verify Email Addresses (Sandbox Mode)

### Step 1: Verify Sender Email (FROM address)

1. In SES Console → **Verified identities**
2. Click **Create identity**
3. **Identity type**: Email address
4. **Email address**: Enter your sender email (e.g., `noreply@yourdomain.com`)
5. Click **Create identity**

### Step 2: Check Verification Email

1. AWS sends verification email to the address
2. Open the email
3. Click the verification link
4. You'll see "Congratulations!" confirmation

### Step 3: Verify Test Recipients (Sandbox Mode Only)

Repeat the process for test recipient emails:
- Your personal email
- Team member emails
- Any email address you want to test with

**Production Mode**: Skip this step - can send to anyone

---

## 4. Configure IAM Permissions

### Option A: Reuse S3 IAM User (Recommended)

If you already created `daily-baker-s3-user` for S3, add SES permissions:

1. Go to IAM Console → **Users** → `daily-baker-s3-user`
2. **Permissions** tab → **Add permissions** → **Attach policies directly**
3. Search for `AmazonSESFullAccess`
4. Check the box ✅
5. Click **Add permissions**

### Option B: Create Dedicated SES User

1. Go to IAM Console → **Users** → **Create user**
2. **User name**: `daily-baker-ses-user`
3. **Next** → **Attach policies directly**
4. Select `AmazonSESFullAccess`
5. **Next** → **Create user**
6. Create access key (same process as S3 setup)
7. Save **Access Key ID** and **Secret Access Key**

### Production IAM Policy (Recommended)

Instead of `AmazonSESFullAccess`, use minimal permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail",
        "ses:VerifyEmailIdentity",
        "ses:GetSendStatistics"
      ],
      "Resource": "*"
    }
  ]
}
```

**To apply**:
1. IAM → Users → your user → **Add permissions** → **Create inline policy**
2. **JSON** tab → Paste policy above
3. Name: `DailyBakerSESPolicy`
4. **Create policy**

---

## 5. Configure Environment Variables

### Option A: Same AWS Credentials as S3

If using the same IAM user for both S3 and SES, you already have these in `.env`:

```bash
# AWS Configuration (shared for S3 and SES)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

Add SES-specific variables:

```bash
# AWS SES Configuration
AWS_SES_REGION=us-east-1  # Same as AWS_REGION (optional override)
AWS_SES_FROM_EMAIL=noreply@yourdomain.com
```

### Option B: Dedicated SES Credentials

If using a separate IAM user for SES:

```bash
# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE_S3
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY_S3

# AWS SES Configuration
AWS_SES_REGION=us-east-1
AWS_SES_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE_SES
AWS_SES_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY_SES
AWS_SES_FROM_EMAIL=noreply@yourdomain.com
```

**Note**: The current implementation (lib/ses.ts) uses the same AWS credentials for both S3 and SES.

### Production (Vercel)

1. Go to Vercel project → **Settings** → **Environment Variables**
2. Add (or update existing):
   - `AWS_REGION` = `us-east-1`
   - `AWS_ACCESS_KEY_ID` = your access key (mark as **Secret**)
   - `AWS_SECRET_ACCESS_KEY` = your secret key (mark as **Secret**)
   - `AWS_SES_FROM_EMAIL` = `noreply@yourdomain.com` (mark as **Secret**)
3. Apply to: Production, Preview, Development

---

## 6. Test Email Sending

### Using AWS CLI (Optional)

```bash
# Install AWS CLI if not already installed
brew install awscli  # macOS
# or: https://aws.amazon.com/cli/

# Configure AWS CLI
aws configure
# Enter: Access Key ID, Secret Access Key, Region (us-east-1), Output format (json)

# Send test email
aws ses send-email \
  --from noreply@yourdomain.com \
  --destination "ToAddresses=your-verified-email@example.com" \
  --message "Subject={Data=Test from AWS SES,Charset=UTF-8},Body={Text={Data=This is a test email from Daily Baker.,Charset=UTF-8}}" \
  --region us-east-1

# Expected output:
# {
#   "MessageId": "EXAMPLE78603177f-7a5433e7-8edb-42ae-af10-f0181f34d6ee-000000"
# }
```

### Using Application Code

Once your app is running:

```bash
# Start dev server
npm run dev

# In a separate terminal, test with curl
# (Requires authentication - you'll need a valid session)
```

Or create a test API route temporarily:

**src/app/api/test-email/route.ts**:
```typescript
import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/ses';

export async function GET() {
  try {
    await sendEmail({
      to: 'your-verified-email@example.com',  // Must be verified in Sandbox Mode
      subject: 'Test from Daily Baker',
      body: 'This is a test email sent from the Daily Baker application using AWS SES.',
    });

    return NextResponse.json({ success: true, message: 'Email sent!' });
  } catch (error) {
    console.error('Email send error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
```

Test it:
```bash
curl http://localhost:3000/api/test-email
```

**Remember to delete this test route** after confirming emails work!

---

## 7. Email Template Usage

Daily Baker includes pre-built email templates in `src/lib/ses.ts`:

### User Invitation Email

```typescript
import { sendUserInvitation } from '@/lib/ses';

await sendUserInvitation({
  toEmail: 'newuser@example.com',
  toName: 'John Doe',
  bakeryName: 'Artisan Bakery',
  inviteUrl: 'https://daily-baker.com/invite/abc123',
});
```

**Email Preview**:
- Subject: "Invitation to join Artisan Bakery on Daily Baker"
- Professional HTML design with Daily Baker branding
- Blue header with call-to-action button
- Plain text fallback included

### Low Stock Alert

```typescript
import { sendLowStockAlert } from '@/lib/ses';

await sendLowStockAlert({
  toEmail: 'manager@bakery.com',
  bakeryName: 'Artisan Bakery',
  ingredientName: 'All-Purpose Flour',
  currentQuantity: 5,
  unit: 'kg',
});
```

**Email Preview**:
- Subject: "Low Stock Alert: All-Purpose Flour"
- Red alert styling
- Current quantity highlighted
- Prompts to reorder

### Bake Sheet Completion

```typescript
import { sendBakeSheetCompleted } from '@/lib/ses';

await sendBakeSheetCompleted({
  toEmail: 'manager@bakery.com',
  bakeryName: 'Artisan Bakery',
  recipeName: 'Sourdough Bread',
  quantity: '50 loaves',
  completedBy: 'Jane Smith',
});
```

**Email Preview**:
- Subject: "Bake Sheet Completed: Sourdough Bread"
- Green success styling
- Production details
- Inventory update notification

### Platform Admin Alert

```typescript
import { sendPlatformAdminAlert } from '@/lib/ses';

await sendPlatformAdminAlert({
  toEmail: 'admin@daily-baker.com',
  subject: 'New Bakery Signup',
  message: 'A new bakery "Artisan Bakery" has signed up and needs approval.',
  action: 'Review the bakery in the admin dashboard and approve if legitimate.',
});
```

**Email Preview**:
- Subject: "[Platform Admin] New Bakery Signup"
- Purple admin theme
- Custom message and action items

---

## 8. Custom Email Templates

### Creating New Templates

Follow the pattern in `src/lib/ses.ts`:

```typescript
export async function sendCustomEmail(params: {
  toEmail: string;
  // ... your parameters
}): Promise<void> {
  const { toEmail } = params;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .button { display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 4px; }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Daily Baker</h1>
    </div>
    <div class="content">
      <!-- Your email content here -->
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Daily Baker. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;

  const textBody = `
Your plain text version here...
  `;

  await sendHtmlEmail({
    to: toEmail,
    subject: 'Your subject',
    html,
    textBody,
  });
}
```

### Email Design Best Practices

1. **Always include plain text version** - Some email clients block HTML
2. **Inline CSS only** - External stylesheets don't work in emails
3. **Keep width under 600px** - Mobile compatibility
4. **Test across email clients** - Gmail, Outlook, Apple Mail
5. **Include footer with unsubscribe** (for production)
6. **Avoid spam trigger words** - "Free", "Act now", excessive caps

---

## 9. Moving to Production Mode

### When to Request Production Access

Request when:
- You're ready to send to real customers
- You need more than 200 emails per day
- You want to send to unverified addresses

### Request Process

1. Go to SES Console → **Account dashboard**
2. Click **Request production access**
3. Fill out form:

**Mail type**: Transactional
**Website URL**: Your production URL (e.g., `https://daily-baker.com`)
**Use case description** (example):
```
Daily Baker is a bakery operations management platform that sends
transactional emails to bakery staff, including:
- User invitation emails when bakery managers invite team members
- Low inventory alerts when ingredients are running low
- Production completion notifications when bake sheets are finished
- Administrative notifications for platform admins

All emails are sent to users who have accounts in our system and
expect these notifications as part of normal operations.

We handle bounces and complaints by monitoring SES metrics and
immediately removing addresses that hard bounce. Our application
logs all email events for compliance.
```

**Additional contacts**: Your email
**Compliance**: Acknowledge terms

4. **Submit** - Usually approved within 24 hours

### After Approval

1. No need to verify recipient emails anymore
2. Higher sending limits (check your dashboard)
3. Can send to any email address
4. Monitor bounce and complaint rates (keep below 5%)

---

## 10. Monitoring Email Activity

### SES Console Metrics

1. Go to SES Console → **Account dashboard**
2. View metrics:
   - **Sends**: Total emails sent
   - **Bounces**: Emails that couldn't be delivered
   - **Complaints**: Recipients marked as spam
   - **Delivery rate**: Percentage successfully delivered

### CloudWatch Integration

For detailed monitoring:

1. SES Console → **Configuration sets** → **Create configuration set**
2. Name: `daily-baker-emails`
3. Add **Event destination** → **CloudWatch**
4. Select metrics to track:
   - Send
   - Delivery
   - Bounce
   - Complaint
   - Open (requires tracking pixel)
   - Click (requires link tracking)

### Application Logging

Log email sends in your application:

```typescript
try {
  await sendEmail({ to, subject, body });
  console.log(`Email sent to ${to}: ${subject}`);
} catch (error) {
  console.error(`Email failed to ${to}:`, error);
  // Consider saving to database for retry
}
```

---

## 11. Handling Bounces and Complaints

### Types of Bounces

**Hard Bounce** (permanent):
- Email address doesn't exist
- Domain doesn't exist
- Mailbox full

**Soft Bounce** (temporary):
- Mailbox temporarily unavailable
- Message too large
- DNS lookup failure

### Best Practices

1. **Monitor bounce rate** (keep below 5%)
2. **Remove hard bounces immediately** from your email list
3. **Retry soft bounces** (max 3 attempts)
4. **Track complaints** (users marking emails as spam)
5. **Remove complainers** from your list

### Setup SNS Notifications (Advanced)

To automatically handle bounces:

1. Create SNS topic for bounces
2. Subscribe to topic (email or Lambda function)
3. SES → Verified identities → Your email → Notifications
4. Configure bounce feedback

---

## 12. Domain Verification (Recommended for Production)

### Why Verify a Domain?

Instead of verifying individual email addresses:
- Verify your entire domain (e.g., `daily-baker.com`)
- Send from any `@daily-baker.com` address
- Better deliverability with DKIM signing
- Professional appearance

### Verification Process

1. SES Console → **Verified identities** → **Create identity**
2. **Identity type**: Domain
3. **Domain**: `daily-baker.com` (without http://)
4. **DKIM signing**: ✅ Enable (recommended)
5. Click **Create identity**

### DNS Records

AWS provides DNS records to add:

**DKIM Records** (3 CNAME records):
```
Name: abc123._domainkey.daily-baker.com
Value: abc123.dkim.amazonses.com
```

Add these to your DNS provider (Vercel, Cloudflare, etc.)

**Verification Record**:
```
Name: _amazonses.daily-baker.com
Type: TXT
Value: provided-verification-token
```

### Verification Status

- Check SES Console for verification status
- DNS propagation takes 5 minutes to 24 hours
- Status shows "Verified" when complete

---

## 13. Cost Management

### Free Tier

**For EC2-hosted applications**: 62,000 emails per month free

**For applications hosted outside AWS** (like Vercel):
- First 1,000 emails: Free
- After that: $0.10 per 1,000 emails

### Pricing (after free tier)

- **Emails**: $0.10 per 1,000 emails
- **Data transfer**: $0.12 per GB (usually negligible)

### Example Costs

Daily Baker bakery sending:
- 10 user invitations/month
- 50 low stock alerts/month
- 100 bake sheet completions/month
- **Total**: 160 emails/month = **Free** (under 1,000)

Medium bakery:
- 5,000 emails/month
- **Cost**: (5,000 - 1,000) × $0.10 / 1,000 = **$0.40/month**

Large bakery:
- 50,000 emails/month
- **Cost**: (50,000 - 1,000) × $0.10 / 1,000 = **$4.90/month**

**Conclusion**: Very affordable for most use cases!

### Cost Optimization

1. **Don't send unnecessary emails**
2. **Batch notifications** (daily digest instead of real-time)
3. **Use webhooks** instead of polling + email
4. **Monitor usage** in AWS Cost Explorer

---

## 14. Security Best Practices

### API Key Security

- ✅ Use IAM user with minimal SES permissions
- ✅ Never commit AWS credentials to git
- ✅ Use environment variables for credentials
- ✅ Rotate credentials periodically
- ❌ Never expose credentials in client code

### Email Security

- ✅ Always use HTTPS for invite links
- ✅ Validate email addresses before sending
- ✅ Rate limit email sending (prevent abuse)
- ✅ Log all email activity for auditing
- ✅ Use unsubscribe links (for marketing emails)
- ❌ Never send sensitive data in email (passwords, credit cards)

### Anti-Spam Measures

1. **SPF Record** (Sender Policy Framework):
   ```
   v=spf1 include:amazonses.com ~all
   ```

2. **DKIM Signing**: Enable in domain verification

3. **DMARC Policy** (optional):
   ```
   v=DMARC1; p=quarantine; rua=mailto:dmarc@daily-baker.com
   ```

4. **List-Unsubscribe Header** (for bulk emails)

---

## 15. Troubleshooting

### "Email address is not verified" Error

**Cause**: SES is in Sandbox Mode and recipient email not verified

**Fix**:
1. Go to SES Console → Verified identities
2. Verify the recipient email address
3. Check their inbox for verification email
4. Click verification link
5. Or: Request Production Access to send to anyone

### "MessageRejected: Email address not verified" Error

**Cause**: FROM email address not verified

**Fix**:
1. Verify `AWS_SES_FROM_EMAIL` in SES Console
2. Check verification status is "Verified"
3. Wait for DNS propagation if using domain verification

### "Throttling: Rate exceeded" Error

**Cause**: Sending too many emails too quickly

**Sandbox Mode Limits**:
- 1 email per second
- 200 emails per 24 hours

**Fix**:
1. Add delay between sends: `await new Promise(r => setTimeout(r, 1000))`
2. Or: Request Production Access for higher limits
3. Check current limits: SES Console → Account dashboard

### Emails Going to Spam

**Causes**:
- Missing SPF/DKIM/DMARC records
- Poor email reputation
- Spammy content
- High bounce/complaint rates

**Fix**:
1. Verify domain with DKIM
2. Add SPF record to DNS
3. Avoid spam trigger words
4. Ensure recipients expect your emails
5. Monitor bounce and complaint rates
6. Warm up your sending (gradually increase volume)

### "Invalid parameter" Error

**Cause**: Malformed email address or missing parameters

**Debug**:
```typescript
console.log('Sending email:', {
  to,
  subject,
  bodyLength: body.length,
  from: FROM_EMAIL,
});

await sendEmail({ to, subject, body });
```

**Common issues**:
- Email address has spaces
- Missing @ symbol
- Array passed as string
- Empty subject or body

### HTML Not Rendering

**Cause**: Email client blocking HTML or CSS issues

**Fix**:
1. Test with multiple email clients (Gmail, Outlook, Apple Mail)
2. Ensure inline CSS (no external stylesheets)
3. Keep design simple (no flexbox, grid)
4. Always include plain text fallback
5. Use email testing service: https://www.litmus.com or https://putsmail.com

---

## 16. Testing Email Templates

### Manual Testing

Send test emails to yourself:

```typescript
// src/app/api/test-templates/route.ts
import { NextResponse } from 'next/server';
import {
  sendUserInvitation,
  sendLowStockAlert,
  sendBakeSheetCompleted,
} from '@/lib/ses';

export async function GET() {
  const testEmail = 'your-email@example.com'; // Your verified email

  try {
    // Test invitation
    await sendUserInvitation({
      toEmail: testEmail,
      toName: 'Test User',
      bakeryName: 'Test Bakery',
      inviteUrl: 'https://example.com/invite/test',
    });

    // Test low stock alert
    await sendLowStockAlert({
      toEmail: testEmail,
      bakeryName: 'Test Bakery',
      ingredientName: 'Test Ingredient',
      currentQuantity: 5,
      unit: 'kg',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
```

### Email Preview Tools

**Option 1: Mailtrap** (Development)
- Catches emails without sending to real addresses
- Preview in different email clients
- Free tier available
- https://mailtrap.io

**Option 2: Litmus** (Professional)
- Test email rendering across 90+ email clients
- Spam filter testing
- Paid service
- https://www.litmus.com

**Option 3: Email on Acid**
- Similar to Litmus
- https://www.emailonacid.com

---

## 17. Resources

### Documentation

- [AWS SES Documentation](https://docs.aws.amazon.com/ses/)
- [AWS SDK for JavaScript v3 - SES](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/ses/)
- [SES Sending Limits](https://docs.aws.amazon.com/ses/latest/dg/manage-sending-quotas.html)
- [Email Authentication](https://docs.aws.amazon.com/ses/latest/dg/email-authentication.html)

### Tools

- [AWS CLI - SES Commands](https://docs.aws.amazon.com/cli/latest/reference/ses/)
- [Email Template Testing](https://putsmail.com)
- [SPF Record Check](https://mxtoolbox.com/spf.aspx)
- [DMARC Check](https://mxtoolbox.com/dmarc.aspx)

### Email Best Practices

- [Email Design Guide](https://www.campaignmonitor.com/css/)
- [Avoiding Spam Filters](https://blog.hubspot.com/marketing/avoid-spam-filters)
- [Transactional Email Best Practices](https://sendgrid.com/resource/transactional-email-best-practices/)

---

## 18. Next Steps

After SES is configured:

1. ✅ SES verified email addresses (Sandbox Mode)
2. ✅ IAM permissions configured
3. ✅ Environment variables set
4. ✅ Email templates ready
5. ⏳ Test email sending in development
6. ⏳ Implement email triggers in application
7. ⏳ Request Production Access when ready
8. ⏳ Set up domain verification for production
9. ⏳ Configure bounce/complaint handling

**Your transactional email service is now ready for development!**

**Production Checklist**:
- [ ] Request Production Access from AWS
- [ ] Verify domain with DKIM
- [ ] Add SPF and DMARC DNS records
- [ ] Set up bounce and complaint handling
- [ ] Monitor email metrics in SES Console
- [ ] Test across multiple email clients
