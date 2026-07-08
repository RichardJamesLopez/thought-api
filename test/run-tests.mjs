import { spawn } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';

if (!existsSync('dist/index.js')) {
  await run('npm', ['run', 'build']);
}

for (const path of ['thought-test.db', 'thought-test.db-shm', 'thought-test.db-wal']) {
  rmSync(path, { force: true });
}

const env = {
  ...process.env,
  NODE_ENV: 'test',
  PORT: '3001',
  TEST_API_URL: 'http://localhost:3001',
  DB_PATH: './thought-test.db',
  ADMIN_API_KEY: 'local-admin-key',
  ADMIN_PASSWORD: 'admin-password',
  CONSENT_GATE_ENABLED: 'false',
  ENABLE_LIFECYCLE: 'false',
};

const server = spawn(process.execPath, ['dist/index.js'], {
  env,
  stdio: ['ignore', 'pipe', 'pipe'],
});

let serverOutput = '';
server.stdout.on('data', chunk => { serverOutput += chunk.toString(); });
server.stderr.on('data', chunk => { serverOutput += chunk.toString(); });

try {
  await waitForHealth(env.TEST_API_URL);
  const result = await run('npx', ['vitest', 'run'], { env });
  process.exitCode = result;
} finally {
  server.kill('SIGTERM');
  await new Promise(resolve => server.once('exit', resolve));
  if (process.exitCode && serverOutput) {
    console.error(serverOutput);
  }
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      env: options.env ?? process.env,
    });
    child.on('error', reject);
    child.on('exit', code => resolve(code ?? 1));
  });
}

async function waitForHealth(baseUrl) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`server exited before health check passed\n${serverOutput}`);
    }
    try {
      const res = await fetch(`${baseUrl}/health`);
      if (res.ok) return;
    } catch {
      // Server is still starting.
    }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error(`timed out waiting for ${baseUrl}/health\n${serverOutput}`);
}
