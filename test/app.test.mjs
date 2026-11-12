import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAppServer } from '../src/app.mjs';

async function withServer(config, callback) {
  const server = createAppServer(config);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const { port } = server.address();
    await callback(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
  }
}

test('liveness returns 200', async () => {
  await withServer({}, async (base) => {
    const res = await fetch(`${base}/health/live`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { status: 'alive' });
  });
});

test('readiness can simulate a broken release without killing the process', async () => {
  await withServer({ readiness: 'false' }, async (base) => {
    const res = await fetch(`${base}/health/ready`);
    assert.equal(res.status, 503);
    assert.deepEqual(await res.json(), { status: 'not_ready' });
    assert.equal((await fetch(`${base}/health/live`)).status, 200);
  });
});

test('info identifies the exact build revision', async () => {
  await withServer({ version: '1.2.3', revision: 'abc123', environment: 'pr-17', hostname: 'test-host' }, async (base) => {
    const res = await fetch(`${base}/api/info`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), {
      service: 'academy-preview-api', version: '1.2.3', revision: 'abc123', environment: 'pr-17', hostname: 'test-host', ready: true
    });
  });
});

test('other routes return 404', async () => {
  await withServer({}, async (base) => {
    assert.equal((await fetch(`${base}/unknown`)).status, 404);
  });
});
