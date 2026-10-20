import { NextResponse } from 'next/server';
import { readDb } from '@/lib/server/db';

export async function GET() {
  try {
    const db = readDb();
    return NextResponse.json({ topics: db.topics });
  } catch (err) {
    console.error('Fetch topics error:', err);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
