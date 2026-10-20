import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/server/db';

export async function PUT(request) {
  try {
    const { userId, bio, skills, experienceLevel, yearsExp } = await request.json();

    if (!userId) {
      return NextResponse.json({ message: 'User ID is required' }, { status: 400 });
    }

    const db = readDb();
    const index = db.users.findIndex(u => u.id === userId);

    if (index === -1) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const updated = {
      ...db.users[index],
      ...(bio !== undefined && { bio: bio.trim() }),
      ...(skills !== undefined && { skills }),
      ...(experienceLevel !== undefined && { experienceLevel }),
      ...(yearsExp !== undefined && { yearsExp: parseInt(yearsExp, 10) || 0 }),
    };

    db.users[index] = updated;
    writeDb(db);

    const { password: _, ...safeUser } = updated;
    return NextResponse.json({ user: safeUser });
  } catch (err) {
    console.error('Update profile error:', err);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
