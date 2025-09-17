import { NextRequest, NextResponse } from 'next/server';
import { buildApiUrl } from '../../config/api';

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;

    // Basic validation
    if (!name) {
      return NextResponse.json(
        { message: 'Name is required' },
        { status: 400 }
      );
    }

    // Name validation
    if (name && (typeof name !== 'string' || name.trim().length === 0)) {
      return NextResponse.json(
        { message: 'Name must be a non-empty string' },
        { status: 400 }
      );
    }

    if (name && name.length > 100) {
      return NextResponse.json(
        { message: 'Name must be less than 100 characters' },
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
      buildApiUrl('/users/me'),
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieHeader,
        },
        body: JSON.stringify({
          name: name?.trim(),
        }),
      }
    );

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json();
      return NextResponse.json(
        { message: errorData.message || 'Failed to update profile' },
        { status: backendResponse.status }
      );
    }

    const result = await backendResponse.json();

    return NextResponse.json(
      {
        message: 'Profile updated successfully',
        user: result,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password } = body;

    // Basic validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { message: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { message: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Make request to your backend API
    const backendResponse = await fetch(
      buildApiUrl('/users'),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          name,
        }),
      }
    );

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json();
      return NextResponse.json(
        { message: errorData.message || 'Failed to create admin user' },
        { status: backendResponse.status }
      );
    }

    const result = await backendResponse.json();

    return NextResponse.json(
      {
        message: 'Admin user created successfully',
        user: result,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating admin user:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
