import { NextRequest, NextResponse } from 'next/server';
import { requireBakeryUser } from '@/lib/clerk';
import {
  generateUploadUrl,
  generateFileKey,
  isValidFileType,
  ALLOWED_TYPES,
  FILE_SIZE_LIMITS,
} from '@/lib/s3';

export async function POST(request: NextRequest) {
  try {
    // Require authentication and bakery association
    const user = await requireBakeryUser();

    // Parse request body
    const body = await request.json();
    const { filename, contentType, folder = 'uploads', fileSize } = body;

    // Validate required fields
    if (!filename || !contentType) {
      return NextResponse.json(
        { error: 'filename and contentType are required' },
        { status: 400 }
      );
    }

    // Validate content type
    if (!isValidFileType(contentType, ALLOWED_TYPES.ALL)) {
      return NextResponse.json(
        { error: 'File type not allowed' },
        { status: 400 }
      );
    }

    // Validate file size
    const isImage = ALLOWED_TYPES.IMAGES.includes(contentType);
    const maxSize = isImage ? FILE_SIZE_LIMITS.IMAGE : FILE_SIZE_LIMITS.DOCUMENT;

    if (fileSize && fileSize > maxSize) {
      return NextResponse.json(
        {
          error: `File size exceeds limit of ${maxSize / 1024 / 1024}MB`,
        },
        { status: 400 }
      );
    }

    // Generate S3 key
    const key = generateFileKey(user.bakeryId!, folder, filename);

    // Generate presigned URL (expires in 60 seconds)
    const uploadUrl = await generateUploadUrl(key, contentType, 60);

    // Return presigned URL and key
    return NextResponse.json({
      uploadUrl,
      key,
      expiresIn: 60,
    });
  } catch (error) {
    console.error('Error generating presigned URL:', error);

    if (error instanceof Error && error.message === 'Bakery association required') {
      return NextResponse.json(
        { error: 'User must be assigned to a bakery' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
}
