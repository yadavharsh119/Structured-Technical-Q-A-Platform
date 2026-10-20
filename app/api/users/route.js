import { NextResponse } from 'next/server';
import { readDb } from '@/lib/server/db';

export async function GET() {
  try {
    const db = readDb();
    const safeUsers = db.users.map(({ password, ...u }) => u);
    return NextResponse.json({ users: safeUsers });
  } catch (err) {
    console.error('Fetch users error:', err);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
