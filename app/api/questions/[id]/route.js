import { NextResponse } from 'next/server';
import { readDb } from '@/lib/server/db';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const db = readDb();
    const question = db.questions.find(q => q.id === id);

    if (!question) {
      return NextResponse.json({ message: 'Question not found' }, { status: 404 });
    }

    const perspectives = db.perspectives
      .filter(p => p.questionId === id)
      .sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));

    return NextResponse.json({
      question: {
        ...question,
        perspectiveCount: perspectives.length,
      },
      perspectives,
    });
  } catch (err) {
    console.error('Fetch question by ID error:', err);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
