import { NextResponse } from 'next/server';

// This value is set at build time and remains constant for the lifetime of the deployment
const BUILD_ID = process.env.NEXT_BUILD_ID || process.env.VERCEL_GIT_COMMIT_SHA || Date.now().toString();

export async function GET() {
  return NextResponse.json(
    { version: BUILD_ID },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
}
