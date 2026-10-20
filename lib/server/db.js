import fs from 'fs';
import path from 'path';
import { SEED_USERS, SEED_TOPICS, SEED_QUESTIONS, SEED_PERSPECTIVES, SEED_VOTES } from '@/lib/seed';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

function ensureDbFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      users: SEED_USERS,
      topics: SEED_TOPICS,
      questions: SEED_QUESTIONS,
      perspectives: SEED_PERSPECTIVES,
      votes: SEED_VOTES,
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
  }
}

export function readDb() {
  ensureDbFile();
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    console.error('Error reading db.json:', error);
    return { users: [], topics: [], questions: [], perspectives: [], votes: [] };
  }
}

export function writeDb(data) {
  ensureDbFile();
  const tempFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tempFile, DB_FILE);
  return data;
}
