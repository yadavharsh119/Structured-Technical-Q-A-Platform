// Jest runs this before any test module is imported so the app starts in test
// mode (rate limiters are skipped and dotenv does not override this value).
import fs from 'fs';
import os from 'os';
import path from 'path';

process.env.NODE_ENV = 'test';
process.env.UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'structured-qa-uploads-'));
