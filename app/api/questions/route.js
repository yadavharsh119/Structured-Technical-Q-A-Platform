import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/server/db';
import { validateQuestion } from '@/lib/validators';
import { generateId } from '@/lib/utils';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const topicSlug = searchParams.get('topic') || '';
    const sort = searchParams.get('sort') || 'recent';
    const authorId = searchParams.get('authorId') || '';

    const db = readDb();
    let results = [...db.questions];

    if (authorId) {
      results = results.filter(q => q.authorId === authorId);
    }

    if (topicSlug) {
      results = results.filter(q => q.topics?.includes(topicSlug));
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      results = results.filter(item =>
        item.title.toLowerCase().includes(q) ||
        item.context.toLowerCase().includes(q) ||
        item.topics.some(t => t.toLowerCase().includes(q))
      );
    }

    // Attach real perspective count
    results = results.map(q => ({
      ...q,
      perspectiveCount: db.perspectives.filter(p => p.questionId === q.id).length
    }));

    if (sort === 'trending') {
      results.sort((a, b) => b.perspectiveCount - a.perspectiveCount);
    } else {
      results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return NextResponse.json({ questions: results });
  } catch (err) {
    console.error('Fetch questions error:', err);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const validation = validateQuestion(body);

    if (!validation.isValid) {
      return NextResponse.json({ message: 'Validation failed', errors: validation.errors }, { status: 400 });
    }

    if (!body.authorId) {
      return NextResponse.json({ message: 'Author ID is required' }, { status: 401 });
    }

    const db = readDb();
    const newQuestion = {
      id: generateId('q'),
      title: body.title.trim(),
      context: body.context.trim(),
      type: body.type || 'Experience-based',
      topics: body.topics || [],
      authorId: body.authorId,
      createdAt: new Date().toISOString(),
      perspectiveCount: 0
    };

    db.questions.unshift(newQuestion);

    // Update topic counts
    newQuestion.topics.forEach(slug => {
      const topic = db.topics.find(t => t.slug === slug);
      if (topic) topic.questionCount = (topic.questionCount || 0) + 1;
    });

    writeDb(db);
    return NextResponse.json({ question: newQuestion }, { status: 201 });
  } catch (err) {
    console.error('Create question error:', err);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
