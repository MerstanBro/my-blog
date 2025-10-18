import { revalidatePath, revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

// Secret token to protect the revalidation endpoint
const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET || 'your-secret-token';

export async function POST(request: NextRequest) {
  try {
    // Check for secret to confirm this is a valid request
    const authHeader = request.headers.get('authorization');
    const secret = request.nextUrl.searchParams.get('secret');

    if (authHeader !== `Bearer ${REVALIDATE_SECRET}` && secret !== REVALIDATE_SECRET) {
      return NextResponse.json(
        { error: 'Invalid authorization' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { path, tag } = body;

    // Revalidate by path
    if (path) {
      revalidatePath(path);
      return NextResponse.json({
        revalidated: true,
        type: 'path',
        path,
        now: Date.now(),
      });
    }

    // Revalidate by tag
    if (tag) {
      revalidateTag(tag);
      return NextResponse.json({
        revalidated: true,
        type: 'tag',
        tag,
        now: Date.now(),
      });
    }

    return NextResponse.json(
      { error: 'Missing path or tag parameter' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Revalidation error:', error);
    return NextResponse.json(
      { error: 'Error revalidating', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// GET endpoint for manual browser testing
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  const path = request.nextUrl.searchParams.get('path');

  if (secret !== REVALIDATE_SECRET) {
    return NextResponse.json(
      { error: 'Invalid secret' },
      { status: 401 }
    );
  }

  if (!path) {
    return NextResponse.json(
      { error: 'Missing path parameter' },
      { status: 400 }
    );
  }

  try {
    revalidatePath(path);
    return NextResponse.json({
      revalidated: true,
      path,
      now: Date.now(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error revalidating', details: (error as Error).message },
      { status: 500 }
    );
  }
}

