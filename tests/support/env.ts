// Tests only ever use TEST_DATABASE_URL. Without it, point at a closed port so nothing real is touched.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://nobody:nothing@127.0.0.1:1/none';
process.env.BETTER_AUTH_SECRET ||= 'test-secret-not-used-anywhere-real-000000';
