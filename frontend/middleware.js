import { NextResponse } from 'next/server';

export function middleware(request) {
  // Auth is handled client-side in dashboard layout (checks localStorage)
  // Middleware can't access localStorage (server-side only)
  // So we just pass through and let the layout handle redirects
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/signup'],
};
