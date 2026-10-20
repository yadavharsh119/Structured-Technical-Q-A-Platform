import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/server/db';
import { validateRegister } from '@/lib/validators';
import { generateId, getInitials } from '@/lib/utils';

export async function POST(request) {
  try {
    const body = await request.json();
    const validation = validateRegister(body);

    if (!validation.isValid) {
      return NextResponse.json({ message: 'Validation failed', errors: validation.errors }, { status: 400 });
    }

    const db = readDb();
    
    // Check uniqueness
    if (db.users.some(u => u.email.toLowerCase() === body.email.toLowerCase())) {
      return NextResponse.json({ message: 'An account with this email already exists' }, { status: 409 });
    }
    if (db.users.some(u => u.username.toLowerCase() === body.username.toLowerCase())) {
      return NextResponse.json({ message: 'Username is already taken' }, { status: 409 });
    }

    const newUser = {
      id: generateId('u'),
      name: body.name.trim(),
      username: body.username.trim().toLowerCase(),
      email: body.email.trim().toLowerCase(),
      password: body.password,
      bio: body.bio?.trim() || '',
      experienceLevel: body.experienceLevel || 'Junior',
      yearsExp: body.yearsExp ? parseInt(body.yearsExp, 10) : 0,
      skills: Array.isArray(body.skills) ? body.skills : [],
      avatarInitials: getInitials(body.name),
      avatarColor: '#4F46E5',
      joinedAt: new Date().toISOString(),
    };

    db.users.push(newUser);
    writeDb(db);

    const { password: _, ...safeUser } = newUser;
    return NextResponse.json({ user: safeUser }, { status: 201 });
  } catch (err) {
    console.error('Register error:', err);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
