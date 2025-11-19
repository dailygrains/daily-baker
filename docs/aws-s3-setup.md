# AWS S3 Setup Guide

This guide walks you through setting up Amazon S3 for file storage in Daily Baker.

## Purpose

AWS S3 (Simple Storage Service) is used for storing:
- Recipe instruction images (MDX editor uploads)
- Document attachments
- User-uploaded files
- Any media content in the bakery management system

---

## Prerequisites

- AWS Account (free tier available)
- AWS CLI installed (optional, but recommended)
- Daily Baker repository set up

---

## 1. Create AWS Account

### Step 1: Sign Up for AWS

1. Go to https://aws.amazon.com
2. Click "Create an AWS Account"
3. Follow the signup process:
   - Email address
   - Password
   - Account name
   - Contact information
   - Payment method (required, but free tier available)
   - Identity verification

### Step 2: Access AWS Console

1. Sign in to AWS Management Console
2. Navigate to S3: https://console.aws.amazon.com/s3/

---

## 2. Create S3 Bucket

### Step 1: Create Bucket

1. In S3 Console, click **"Create bucket"**
2. **Bucket name**: `daily-baker-uploads` (must be globally unique)
   - If taken, try: `daily-baker-uploads-[your-name]`
   - Or: `daily-baker-[random-string]`
3. **AWS Region**: Choose closest to your users
   - US East (N. Virginia): `us-east-1` (most common)
   - EU (Ireland): `eu-west-1`
   - Asia Pacific (Sydney): `ap-southeast-2`
4. **Object Ownership**: ACLs disabled (recommended)
5. **Block Public Access**: Keep all boxes checked ✅
   - We'll use presigned URLs for access
   - No public bucket needed
6. **Bucket Versioning**: Disabled (unless you want version history)
7. **Default encryption**: Server-side encryption with Amazon S3 managed keys (SSE-S3)
8. Click **"Create bucket"**

---

## 3. Configure CORS Policy

CORS (Cross-Origin Resource Sharing) allows your Next.js app to upload directly to S3.

### Step 1: Navigate to CORS Settings

1. Click on your bucket name
2. Go to **Permissions** tab
3. Scroll to **Cross-origin resource sharing (CORS)**
4. Click **Edit**

### Step 2: Add CORS Configuration

```json
[
  {
    "AllowedHeaders": [
      "*"
    ],
    "AllowedMethods": [
      "PUT",
      "POST",
      "GET"
    ],
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://yourdomain.com",
      "https://*.vercel.app"
    ],
    "ExposeHeaders": [
      "ETag"
    ],
    "MaxAgeSeconds": 3000
  }
]
```

**Important**: Replace `https://yourdomain.com` with your production domain.

### Step 3: Save Configuration

Click **Save changes**

---

## 4. Create IAM User for Programmatic Access

### Step 1: Navigate to IAM

1. Go to IAM Console: https://console.aws.amazon.com/iam/
2. Click **Users** in sidebar
3. Click **Create user**

### Step 2: Set User Details

1. **User name**: `daily-baker-s3-user`
2. Select **Provide user access to the AWS Management Console**: ❌ Uncheck
3. Click **Next**

### Step 3: Set Permissions

1. Select **Attach policies directly**
2. Search for `AmazonS3FullAccess`
3. Check the box ✅
4. Click **Next**

**Note**: For production, use a custom policy with minimal permissions (see Security Best Practices below)

### Step 4: Review and Create

1. Review settings
2. Click **Create user**

### Step 5: Create Access Key

1. Click on the newly created user
2. Go to **Security credentials** tab
3. Scroll to **Access keys**
4. Click **Create access key**
5. **Use case**: Select "Other"
6. Click **Next**
7. **Description**: "Daily Baker S3 uploads"
8. Click **Create access key**

### Step 6: Save Credentials

**⚠️ CRITICAL**: This is the ONLY time you'll see the secret key!

1. **Access key ID**: `AKIAIOSFODNN7EXAMPLE` (copy this)
2. **Secret access key**: `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` (copy this)
3. Click **Download .csv file** (save securely)
4. **Never commit these to git!**

---

## 5. Configure Environment Variables

### Local Development

Add to `.env` file:

```bash
# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_S3_BUCKET_NAME=daily-baker-uploads
```

**Important**: Never commit `.env` to git!

### Production (Vercel)

1. Go to Vercel project settings
2. Navigate to **Environment Variables**
3. Add variables:
   - `AWS_REGION` = `us-east-1`
   - `AWS_ACCESS_KEY_ID` = your access key (mark as **Secret**)
   - `AWS_SECRET_ACCESS_KEY` = your secret key (mark as **Secret**)
   - `AWS_S3_BUCKET_NAME` = `daily-baker-uploads`
4. Apply to: Production, Preview, Development

---

## 6. Test S3 Upload

### Using AWS CLI (Optional)

```bash
# Configure AWS CLI
aws configure
# Enter: Access Key ID, Secret Access Key, Region, Output format (json)

# Test upload
echo "Test file" > test.txt
aws s3 cp test.txt s3://daily-baker-uploads/test.txt

# Verify upload
aws s3 ls s3://daily-baker-uploads/

# Delete test file
aws s3 rm s3://daily-baker-uploads/test.txt
rm test.txt
```

### Using Application API

Once your app is running:

```bash
# Start dev server
npm run dev

# Test presigned URL generation
curl -X POST http://localhost:3000/api/upload/presigned-url \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "test.jpg",
    "contentType": "image/jpeg",
    "folder": "recipes",
    "fileSize": 1048576
  }'
```

**Note**: Requires authentication. You'll need to be signed in.

---

## 7. File Upload Workflow

### How It Works

1. **Client requests presigned URL**:
   ```typescript
   const response = await fetch('/api/upload/presigned-url', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       filename: 'recipe-image.jpg',
       contentType: 'image/jpeg',
       folder: 'recipes',
       fileSize: file.size,
     }),
   });
   const { uploadUrl, key } = await response.json();
   ```

2. **Client uploads directly to S3**:
   ```typescript
   await fetch(uploadUrl, {
     method: 'PUT',
     headers: { 'Content-Type': 'image/jpeg' },
     body: file,
   });
   ```

3. **Save S3 key in database**:
   ```typescript
   // Store `key` in your database (e.g., recipe.image_key)
   // Use key to generate download URLs later
   ```

### File Organization

Files are organized by bakery and folder:

```
s3://daily-baker-uploads/
├── {bakeryId}/
│   ├── recipes/
│   │   ├── 1234567890-abc123-sourdough-image.jpg
│   │   └── 1234567891-def456-croissant-photo.png
│   ├── attachments/
│   │   └── 1234567892-ghi789-recipe-notes.pdf
│   └── uploads/
│       └── 1234567893-jkl012-equipment-manual.pdf
└── {anotherBakeryId}/
    └── recipes/
        └── ...
```

**Key Format**: `{bakeryId}/{folder}/{timestamp}-{random}-{filename}`

---

## 8. MDX Editor Integration

### Image Upload in MDX Editor

The MDX editor will use the presigned URL API for image uploads:

```typescript
// In MDX editor component (future implementation)
async function uploadImage(file: File): Promise<string> {
  // 1. Get presigned URL
  const response = await fetch('/api/upload/presigned-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
      folder: 'recipes',
      fileSize: file.size,
    }),
  });

  const { uploadUrl, key } = await response.json();

  // 2. Upload to S3
  await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });

  // 3. Return S3 key for embedding in markdown
  return key;
}
```

### Displaying Images

To display images from S3 (private bucket):

```typescript
// Generate temporary download URL
const downloadUrl = await generateDownloadUrl(imageKey, 3600); // 1 hour expiry

// Use in <img> tag or Next.js Image
<img src={downloadUrl} alt="Recipe image" />
```

---

## 9. Security Best Practices

### Production IAM Policy (Recommended)

Instead of `AmazonS3FullAccess`, create a custom policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::daily-baker-uploads",
        "arn:aws:s3:::daily-baker-uploads/*"
      ]
    }
  ]
}
```

### Access Control Checklist

- ✅ Use presigned URLs (not public bucket)
- ✅ Block all public access
- ✅ Limit IAM user permissions
- ✅ Use HTTPS only
- ✅ Enable bucket encryption
- ✅ Set presigned URL expiration (60 seconds for upload, 1 hour for download)
- ❌ Never expose AWS credentials in client code
- ❌ Never commit credentials to git

### File Validation

Always validate on server:
- ✅ File type (whitelist)
- ✅ File size (10MB images, 50MB documents)
- ✅ User authentication
- ✅ Bakery association

---

## 10. Cost Management

### Free Tier Limits

AWS S3 Free Tier (first 12 months):
- **5 GB** of standard storage
- **20,000 GET requests**
- **2,000 PUT requests**

### Pricing (after free tier)

**Storage**:
- $0.023 per GB per month (first 50 TB)

**Requests**:
- PUT/POST: $0.005 per 1,000 requests
- GET: $0.0004 per 1,000 requests

### Cost Optimization

1. **Delete unused files**:
   ```typescript
   await deleteFile(oldImageKey);
   ```

2. **Set lifecycle policies** (auto-delete old files)
3. **Use appropriate storage class**:
   - Standard for active files
   - Glacier for archives (if needed)

4. **Monitor usage** in AWS Cost Explorer

---

## 11. Monitoring

### CloudWatch Metrics

1. Go to S3 Console → Metrics tab
2. View:
   - Storage usage
   - Request counts
   - Error rates
   - Data transfer

### Bucket Logging (Optional)

Enable S3 server access logging:
1. Bucket → Properties → Server access logging
2. Enable logging
3. Choose target bucket for logs
4. Useful for auditing and debugging

---

## 12. Backup Strategy

### Versioning (Optional)

Enable versioning to keep file history:
1. Bucket → Properties → Bucket Versioning
2. Enable
3. Every upload creates a new version
4. Can restore previous versions

**Note**: Increases storage costs

### Cross-Region Replication (Production)

For disaster recovery:
1. Create replica bucket in different region
2. Enable replication rule
3. All objects automatically copied

**Note**: Additional costs apply

---

## 13. Troubleshooting

### "Access Denied" Error

**Causes**:
- Wrong IAM permissions
- CORS not configured
- Presigned URL expired

**Fix**:
1. Check IAM user has S3 permissions
2. Verify CORS policy includes your domain
3. Generate new presigned URL (they expire in 60s)

### CORS Error in Browser

**Error**: `has been blocked by CORS policy`

**Fix**:
1. Check CORS configuration in S3
2. Ensure your domain is in `AllowedOrigins`
3. Verify request method in `AllowedMethods`

### "SignatureDoesNotMatch" Error

**Causes**:
- Wrong AWS credentials
- Credentials mismatch between env and AWS

**Fix**:
1. Verify `AWS_ACCESS_KEY_ID` in `.env`
2. Verify `AWS_SECRET_ACCESS_KEY` in `.env`
3. Ensure no extra spaces or quotes
4. Regenerate access keys if needed

### File Upload Fails Silently

**Checks**:
1. Presigned URL expired (60 second limit)
2. File size exceeds limit
3. Content-Type mismatch
4. Network error

**Debug**:
```typescript
const response = await fetch(uploadUrl, {
  method: 'PUT',
  headers: { 'Content-Type': file.type },
  body: file,
});

if (!response.ok) {
  console.error('Upload failed:', await response.text());
}
```

---

## 14. Resources

### Documentation
- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)
- [Presigned URLs Guide](https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html)

### CLI Tools
- [AWS CLI](https://docs.aws.amazon.com/cli/)
- [S3 CLI Commands](https://docs.aws.amazon.com/cli/latest/reference/s3/)

### Security
- [IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [S3 Security Best Practices](https://docs.aws.amazon.com/AmazonS3/latest/userguide/security-best-practices.html)

---

## 15. Next Steps

After S3 is configured:

1. ✅ S3 bucket created
2. ✅ IAM user with access keys
3. ✅ Environment variables set
4. ✅ CORS configured
5. ⏳ Integrate with MDX editor (Issue #23)
6. ⏳ Add file upload UI components
7. ⏳ Implement file deletion when records deleted

**Your file storage is now ready for production use!**
