import { NextRequest, NextResponse } from 'next/server';
import { buildApiUrl } from '../../../../config/api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { currentPassword, newPassword, confirmNewPassword } = body;

    // Forward cookies from the request to the backend
    const cookieHeader = request.headers.get('cookie');

    if (!cookieHeader) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Make request to your backend API
    const backendResponse = await fetch(
      buildApiUrl('/users/me/change-password'),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmNewPassword,
        }),
      }
    );

    const data = await backendResponse.json();

    if (!backendResponse.ok) {
      return NextResponse.json(
        {
          message: data.message || 'Failed to change password',
        },
        { status: backendResponse.status }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        message: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
