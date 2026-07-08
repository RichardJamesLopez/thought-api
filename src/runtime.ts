export const INSTANCE_ID =
  process.env.RAILWAY_INSTANCE_ID ||
  process.env.INSTANCE_ID ||
  process.env.HOSTNAME ||
  'unknown';
