import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/server/db';
import { generateId } from '@/lib/utils';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    const db = readDb();
    const votes = userId ? db.votes.filter(v => v.userId === userId) : db.votes;
    return NextResponse.json({ votes });
  } catch (err) {
    console.error('Fetch votes error:', err);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { perspectiveId, userId } = await request.json();

    if (!perspectiveId || !userId) {
      return NextResponse.json({ message: 'Perspective ID and User ID are required' }, { status: 400 });
    }

    const db = readDb();
    const pIndex = db.perspectives.findIndex(p => p.id === perspectiveId);

    if (pIndex === -1) {
      return NextResponse.json({ message: 'Perspective not found' }, { status: 404 });
    }

    const perspective = db.perspectives[pIndex];

    // Prevent self-voting
    if (perspective.authorId === userId) {
      return NextResponse.json({ message: 'You cannot upvote your own perspective' }, { status: 403 });
    }

    const voteIndex = db.votes.findIndex(v => v.perspectiveId === perspectiveId && v.userId === userId);
    let hasVoted = false;

    if (voteIndex !== -1) {
      // Remove vote
      db.votes.splice(voteIndex, 1);
      perspective.upvotes = Math.max(0, (perspective.upvotes || 0) - 1);
      hasVoted = false;
    } else {
      // Add vote
      db.votes.push({
        id: generateId('v'),
        perspectiveId,
        userId,
        createdAt: new Date().toISOString()
      });
      perspective.upvotes = (perspective.upvotes || 0) + 1;
      hasVoted = true;
    }

    writeDb(db);
    return NextResponse.json({
      hasVoted,
      upvotes: perspective.upvotes
    });
  } catch (err) {
    console.error('Vote error:', err);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
