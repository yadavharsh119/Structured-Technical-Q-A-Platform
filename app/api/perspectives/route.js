import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/server/db';
import { validatePerspective } from '@/lib/validators';
import { generateId } from '@/lib/utils';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const questionId = searchParams.get('questionId');
    const authorId = searchParams.get('authorId');

    const db = readDb();
    let results = [...db.perspectives];

    if (questionId) {
      results = results.filter(p => p.questionId === questionId);
    }
    if (authorId) {
      results = results.filter(p => p.authorId === authorId);
    }

    results.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
    return NextResponse.json({ perspectives: results });
  } catch (err) {
    console.error('Fetch perspectives error:', err);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { questionId, authorId, background, experience, whatWorked, whatDidntWork, advice } = body;

    if (!questionId || !authorId) {
      return NextResponse.json({ message: 'Question ID and Author ID are required' }, { status: 400 });
    }

    const validation = validatePerspective({ background, experience, whatWorked, whatDidntWork, advice });
    if (!validation.isValid) {
      return NextResponse.json({ message: 'Validation failed', errors: validation.errors }, { status: 400 });
    }

    const db = readDb();

    // STRICT CONSTRAINT: Maximum 1 perspective per contributor per question
    const existing = db.perspectives.find(p => p.questionId === questionId && p.authorId === authorId);
    if (existing) {
      return NextResponse.json({
        message: 'You have already submitted a perspective for this question. Each contributor may only share one structured perspective.'
      }, { status: 409 });
    }

    const newPerspective = {
      id: generateId('p'),
      questionId,
      authorId,
      background: background.trim(),
      experience: experience.trim(),
      whatWorked: whatWorked.trim(),
      whatDidntWork: whatDidntWork.trim(),
      advice: advice.trim(),
      upvotes: 0,
      createdAt: new Date().toISOString()
    };

    db.perspectives.push(newPerspective);

    // Increment perspective count on the question
    const qIndex = db.questions.findIndex(q => q.id === questionId);
    if (qIndex !== -1) {
      db.questions[qIndex].perspectiveCount = (db.questions[qIndex].perspectiveCount || 0) + 1;
    }

    writeDb(db);
    return NextResponse.json({ perspective: newPerspective }, { status: 201 });
  } catch (err) {
    console.error('Create perspective error:', err);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
