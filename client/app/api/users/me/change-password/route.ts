import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { currentPassword, newPassword, confirmNewPassword } = body;

    // Basic validation
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      return NextResponse.json(
        {
          message:
            'Current password, new password, and confirm password are required',
        },
        { status: 400 }
      );
    }

    if (newPassword !== confirmNewPassword) {
      return NextResponse.json(
        { message: 'New passwords do not match' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { message: 'New password must be at least 8 characters long' },
        { status: 400 }
      );
    }

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
      `${
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
      }/users/me/change-password`,
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
      let messageKey = null;
      
      // Handle specific error cases
      if (backendResponse.status === 429) {
        messageKey = 'account.loginSecurity.password.rateLimitExceeded';
      } else if (backendResponse.status === 401) {
        messageKey = 'account.loginSecurity.password.currentPasswordIncorrect';
      } else if (backendResponse.status === 404) {
        messageKey = 'account.loginSecurity.password.userNotFound';
      } else if (backendResponse.status >= 500) {
        messageKey = 'account.loginSecurity.password.internalServerError';
      } else {
        messageKey = 'account.loginSecurity.password.passwordChangeFailed';
      }

      return NextResponse.json(
        {
          message: data.message || 'Failed to change password',
          messageKey: data.messageKey || messageKey,
        },
        { status: backendResponse.status }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Error changing password:', error);
    return NextResponse.json(
      { 
        message: 'Internal server error',
        messageKey: 'account.loginSecurity.password.internalServerError'
      },
      { status: 500 }
    );
  }
}
