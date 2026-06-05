import "@testing-library/jest-dom/vitest";

process.env.DATABASE_URL ??=
  "postgresql://test:test@localhost:5432/test?pgbouncer=true&connection_limit=1";
process.env.DIRECT_URL ??= "postgresql://test:test@localhost:5432/test";
process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "test-service-role-key";
process.env.SESSION_IDLE_TIMEOUT_MIN ??= "30";
process.env.LOGIN_LOCK_THRESHOLD ??= "5";
process.env.LOGIN_LOCK_DURATION_MIN ??= "15";
