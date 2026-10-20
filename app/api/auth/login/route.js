import { NextResponse } from 'next/server';
import { readDb } from '@/lib/server/db';

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });
    }

    const db = readDb();
    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user || user.password !== password) {
      return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 });
    }

    // Return user without sensitive info
    const { password: _, ...safeUser } = user;
    return NextResponse.json({ user: safeUser });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
