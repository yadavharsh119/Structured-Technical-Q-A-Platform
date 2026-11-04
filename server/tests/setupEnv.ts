// Jest runs this before any test module is imported so the app starts in test
// mode (rate limiters are skipped and dotenv does not override this value).
process.env.NODE_ENV = 'test';
