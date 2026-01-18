#!/usr/bin/env node

import http from 'node:http';
import {
  createStatusStream,
  EventTypes,
  StatusStream,
} from '../../lib/status-stream.js';

console.log('=== Status Stream Tests ===\n');

let passed = 0;
let failed = 0;
let testPort = 13080;

function getNextPort() {
  return testPort++;
}

async function httpRequest(port, path) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: 'localhost', port, path, method: 'GET' },
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () =>
          resolve({ status: res.statusCode, headers: res.headers, body }),
        );
      },
    );
    req.on('error', reject);
    req.end();
  });
}

function parseSSE(data) {
  const events = [];
  const lines = data.split('\n\n');
  for (const chunk of lines) {
    if (!chunk.trim()) continue;
    const event = {};
    for (const line of chunk.split('\n')) {
      const match = line.match(/^(\w+):\s*(.*)$/);
      if (match) {
        const [, key, value] = match;
        if (key === 'id') event.id = value;
        else if (key === 'type') event.type = value;
        else if (key === 'data') event.data = value;
        else if (key === 'retry') event.retry = value;
      }
    }
    if (event.type && event.data) {
      try {
        event.data = JSON.parse(event.data);
      } catch {}
    }
    if (Object.keys(event).length > 0) events.push(event);
  }
  return events;
}

async function collectSSEEvents(port, duration = 200) {
  return new Promise((resolve, reject) => {
    const events = [];
    let clientId = null;
    const req = http.request(
      { hostname: 'localhost', port, path: '/events', method: 'GET' },
      (res) => {
        res.on('data', (chunk) => {
          const parsed = parseSSE(chunk.toString());
          for (const event of parsed) {
            events.push(event);
            if (event.type === 'connect') {
              clientId = event.data?.clientId || null;
            }
          }
        });
      },
    );
    req.on('error', reject);
    req.end();
    setTimeout(() => {
      req.destroy();
      resolve({ events, clientId, req });
    }, duration);
  });
}

async function runTests() {
  try {
    console.log(
      'Test 1: StatusStream can be instantiated with default options',
    );
    const stream = new StatusStream();
    if (
      stream.port === 3001 &&
      stream.channelPrefix === 'status:' &&
      stream.heartbeatInterval === 30000
    ) {
      console.log('  PASSED');
      passed++;
    } else {
      console.log('  FAILED: Default options not applied correctly');
      failed++;
    }
  } catch (error) {
    console.log('  FAILED: ' + error.message);
    failed++;
  }

  try {
    console.log(
      '\nTest 2: StatusStream can be instantiated with custom options',
    );
    const stream = new StatusStream({
      port: 9999,
      redisUrl: 'redis://localhost:6379',
      channelPrefix: 'custom:',
      heartbeatInterval: 60000,
      retryInterval: 5000,
    });
    if (
      stream.port === 9999 &&
      stream.redisUrl === 'redis://localhost:6379' &&
      stream.channelPrefix === 'custom:' &&
      stream.heartbeatInterval === 60000 &&
      stream.retryInterval === 5000
    ) {
      console.log('  PASSED');
      passed++;
    } else {
      console.log('  FAILED: Custom options not applied correctly');
      failed++;
    }
  } catch (error) {
    console.log('  FAILED: ' + error.message);
    failed++;
  }

  try {
    const port = getNextPort();
    console.log('\nTest 3: Server starts and listens on the configured port');
    const stream = new StatusStream({ port });
    await stream.start();
    const response = await httpRequest(port, '/health');
    if (response.status === 200) {
      const body = JSON.parse(response.body);
      if (body.status === 'ok' && typeof body.clients === 'number') {
        console.log('  PASSED');
        passed++;
      } else {
        console.log('  FAILED: Health endpoint returned unexpected response');
        failed++;
      }
    } else {
      console.log(
        '  FAILED: Health endpoint returned status ' + response.status,
      );
      failed++;
    }
    await stream.stop();
  } catch (error) {
    console.log('  FAILED: ' + error.message);
    failed++;
  }

  try {
    const port = getNextPort();
    console.log('\nTest 4: Server stops cleanly');
    const stream = new StatusStream({ port });
    await stream.start();
    await stream.stop();
    let serverError = false;
    try {
      await httpRequest(port, '/health');
    } catch (err) {
      serverError = true;
    }
    if (serverError) {
      console.log('  PASSED');
      passed++;
    } else {
      console.log('  FAILED: Server still responding after stop');
      failed++;
    }
  } catch (error) {
    console.log('  FAILED: ' + error.message);
    failed++;
  }

  try {
    const port = getNextPort();
    console.log('\nTest 5: SSE endpoint returns correct headers');
    const stream = new StatusStream({ port });
    await stream.start();
    const response = await new Promise((resolve, reject) => {
      const req = http.request(
        { hostname: 'localhost', port, path: '/events', method: 'GET' },
        (res) => {
          const headers = res.headers;
          resolve(headers);
        },
      );
      req.on('error', reject);
      req.end();
    });
    if (
      response['content-type']?.includes('text/event-stream') &&
      response['cache-control'] === 'no-cache' &&
      response['x-accel-buffering'] === 'no'
    ) {
      console.log('  PASSED');
      passed++;
    } else {
      console.log('  FAILED: Incorrect headers: ' + JSON.stringify(response));
      failed++;
    }
    await stream.stop();
  } catch (error) {
    console.log('  FAILED: ' + error.message);
    failed++;
  }

  try {
    const port = getNextPort();
    console.log('\nTest 6: SSE connection sends connect event with client ID');
    const stream = new StatusStream({ port, heartbeatInterval: 60000 });
    await stream.start();
    const { events, clientId } = await collectSSEEvents(port, 100);
    const hasConnectEvent = events.some(
      (e) => e.type === 'connect' && e.data?.clientId,
    );
    if (hasConnectEvent && clientId && clientId.startsWith('client_')) {
      console.log('  PASSED');
      passed++;
    } else {
      console.log(
        '  FAILED: Connect event not received: ' +
          JSON.stringify({ events, clientId }),
      );
      failed++;
    }
    await stream.stop();
  } catch (error) {
    console.log('  FAILED: ' + error.message);
    failed++;
  }

  try {
    const port = getNextPort();
    console.log('\nTest 7: Client count increases on connection');
    const stream = new StatusStream({ port, heartbeatInterval: 60000 });
    await stream.start();
    if (stream.getClientCount() === 0) {
      const result = collectSSEEvents(port, 500);
      await new Promise((r) => setTimeout(r, 50));
      if (stream.getClientCount() >= 1) {
        console.log('  PASSED');
        passed++;
      } else {
        console.log(
          '  FAILED: Client count is ' +
            stream.getClientCount() +
            ', expected >= 1',
        );
        failed++;
      }
      await result;
    } else {
      console.log('  FAILED: Initial client count is not 0');
      failed++;
    }
    await stream.stop();
  } catch (error) {
    console.log('  FAILED: ' + error.message);
    failed++;
  }

  try {
    const port = getNextPort();
    console.log('\nTest 8: Client count decreases on disconnection');
    const stream = new StatusStream({ port, heartbeatInterval: 60000 });
    await stream.start();
    const result = collectSSEEvents(port, 500);
    await new Promise((r) => setTimeout(r, 100));
    if (stream.getClientCount() >= 1) {
      await result;
      await new Promise((r) => setTimeout(r, 200));
      if (stream.getClientCount() === 0) {
        console.log('  PASSED');
        passed++;
      } else {
        console.log(
          '  FAILED: Client count is ' +
            stream.getClientCount() +
            ', expected 0 after disconnect',
        );
        failed++;
      }
    } else {
      await result;
      console.log(
        '  FAILED: Initial client count is not >= 1, got ' +
          stream.getClientCount(),
      );
      failed++;
    }
    await stream.stop();
  } catch (error) {
    console.log('  FAILED: ' + error.message);
    failed++;
  }

  try {
    const port = getNextPort();
    console.log('\nTest 9: Broadcast sends events to all connected clients');
    const stream = new StatusStream({ port, heartbeatInterval: 60000 });
    await stream.start();

    const events1 = [];
    const events2 = [];

    const req1 = http.request(
      { hostname: 'localhost', port, path: '/events', method: 'GET' },
      (res) => {
        res.on('data', (chunk) => {
          const parsed = parseSSE(chunk.toString());
          events1.push(...parsed);
        });
      },
    );
    req1.end();

    const req2 = http.request(
      { hostname: 'localhost', port, path: '/events', method: 'GET' },
      (res) => {
        res.on('data', (chunk) => {
          const parsed = parseSSE(chunk.toString());
          events2.push(...parsed);
        });
      },
    );
    req2.end();

    await new Promise((r) => setTimeout(r, 150));
    await stream.broadcast('test', EventTypes.STATUS, { message: 'hello' });
    await new Promise((r) => setTimeout(r, 200));

    req1.destroy();
    req2.destroy();

    const statusEvents1 = events1.filter(
      (e) => e.type === 'status' && e.data?.data?.message === 'hello',
    );
    const statusEvents2 = events2.filter(
      (e) => e.type === 'status' && e.data?.data?.message === 'hello',
    );

    if (statusEvents1.length > 0 && statusEvents2.length > 0) {
      console.log('  PASSED');
      passed++;
    } else {
      console.log('  FAILED: Events not received by all clients');
      failed++;
    }
    await stream.stop();
  } catch (error) {
    console.log('  FAILED: ' + error.message);
    failed++;
  }

  try {
    const port = getNextPort();
    console.log('\nTest 10: Send to specific client works');
    const stream = new StatusStream({ port, heartbeatInterval: 60000 });
    await stream.start();

    let clientId = null;
    const targetEvents = [];
    const targetReq = http.request(
      { hostname: 'localhost', port, path: '/events', method: 'GET' },
      (res) => {
        res.on('data', (chunk) => {
          const parsed = parseSSE(chunk.toString());
          for (const event of parsed) {
            targetEvents.push(event);
            if (event.type === 'connect') {
              clientId = event.data?.clientId || null;
            }
          }
        });
      },
    );
    targetReq.end();

    await new Promise((r) => setTimeout(r, 100));

    if (clientId) {
      const otherEvents = [];
      const req = http.request(
        { hostname: 'localhost', port, path: '/events', method: 'GET' },
        (res) => {
          res.on('data', (chunk) => {
            const parsed = parseSSE(chunk.toString());
            otherEvents.push(...parsed);
          });
        },
      );
      req.end();

      await new Promise((r) => setTimeout(r, 50));
      stream.send(clientId, EventTypes.PROGRESS, { percent: 50 });
      await new Promise((r) => setTimeout(r, 100));

      req.destroy();
      targetReq.destroy();

      const targetProgress = targetEvents.filter((e) => e.type === 'progress');
      const otherProgress = otherEvents.filter((e) => e.type === 'progress');
      if (targetProgress.length > 0 && otherProgress.length === 0) {
        console.log('  PASSED');
        passed++;
      } else if (targetProgress.length === 0 && otherProgress.length > 0) {
        console.log('  FAILED: Progress event sent to wrong client');
        failed++;
      } else {
        console.log('  FAILED: Progress event not received');
        failed++;
      }
    } else {
      console.log('  FAILED: Could not get client ID');
      failed++;
    }
    await stream.stop();
  } catch (error) {
    console.log('  FAILED: ' + error.message);
    failed++;
  }

  try {
    const port = getNextPort();
    console.log('\nTest 11: getClientIds returns all connected client IDs');
    const stream = new StatusStream({ port, heartbeatInterval: 60000 });
    await stream.start();

    const c1Promise = collectSSEEvents(port, 500);
    await new Promise((r) => setTimeout(r, 50));
    const c2Promise = collectSSEEvents(port, 500);
    await new Promise((r) => setTimeout(r, 100));

    const clientIds = stream.getClientIds();
    const success = clientIds.length >= 2;

    await c1Promise;
    await c2Promise;

    if (success) {
      console.log('  PASSED');
      passed++;
    } else {
      console.log(
        '  FAILED: Client IDs incorrect, got ' + clientIds.length + ' clients',
      );
      failed++;
    }
    await stream.stop();
  } catch (error) {
    console.log('  FAILED: ' + error.message);
    failed++;
  }

  try {
    const port = getNextPort();
    console.log('\nTest 12: Health endpoint returns correct stats');
    const stream = new StatusStream({ port });
    await stream.start();

    const connPromise = collectSSEEvents(port, 500);
    await new Promise((r) => setTimeout(r, 100));

    const response = await httpRequest(port, '/health');
    const body = JSON.parse(response.body);

    await connPromise;

    if (body.status === 'ok' && body.clients >= 1) {
      console.log('  PASSED');
      passed++;
    } else {
      console.log(
        '  FAILED: Health response incorrect: ' + JSON.stringify(body),
      );
      failed++;
    }
    await stream.stop();
  } catch (error) {
    console.log('  FAILED: ' + error.message);
    failed++;
  }

  try {
    const port = getNextPort();
    console.log('\nTest 13: Stats endpoint returns correct data');
    const stream = new StatusStream({ port, heartbeatInterval: 60000 });
    await stream.start();
    await stream.broadcast('test', EventTypes.STATUS, { foo: 'bar' });

    const response = await httpRequest(port, '/stats');
    const body = JSON.parse(response.body);
    if (
      typeof body.clients === 'number' &&
      typeof body.eventId === 'number' &&
      body.eventId >= 1
    ) {
      console.log('  PASSED');
      passed++;
    } else {
      console.log(
        '  FAILED: Stats response incorrect: ' + JSON.stringify(body),
      );
      failed++;
    }
    await stream.stop();
  } catch (error) {
    console.log('  FAILED: ' + error.message);
    failed++;
  }

  try {
    const port = getNextPort();
    console.log('\nTest 14: Unknown routes return 404');
    const stream = new StatusStream({ port });
    await stream.start();
    const response = await httpRequest(port, '/unknown');
    if (response.status === 404) {
      console.log('  PASSED');
      passed++;
    } else {
      console.log('  FAILED: Expected 404, got ' + response.status);
      failed++;
    }
    await stream.stop();
  } catch (error) {
    console.log('  FAILED: ' + error.message);
    failed++;
  }

  try {
    console.log('\nTest 15: EventTypes enum is exported correctly');
    if (
      EventTypes.STATUS === 'status' &&
      EventTypes.PROGRESS === 'progress' &&
      EventTypes.ERROR === 'error' &&
      EventTypes.CONNECT === 'connect' &&
      EventTypes.DISCONNECT === 'disconnect'
    ) {
      console.log('  PASSED');
      passed++;
    } else {
      console.log('  FAILED: EventTypes enum values incorrect');
      failed++;
    }
  } catch (error) {
    console.log('  FAILED: ' + error.message);
    failed++;
  }

  try {
    const port = getNextPort();
    console.log('\nTest 16: createStatusStream factory function works');
    const stream = await createStatusStream({ port });
    if (stream instanceof StatusStream && stream.port === port) {
      console.log('  PASSED');
      passed++;
    } else {
      console.log(
        '  FAILED: Factory function did not return StatusStream instance',
      );
      failed++;
    }
    await stream.stop();
  } catch (error) {
    console.log('  FAILED: ' + error.message);
    failed++;
  }

  try {
    const port = getNextPort();
    console.log('\nTest 17: SSE retry interval is set correctly');
    const stream = new StatusStream({ port, retryInterval: 5000 });
    await stream.start();

    const { events } = await collectSSEEvents(port, 100);
    const hasRetry = events.some((e) => e.retry === '5000');

    if (hasRetry) {
      console.log('  PASSED');
      passed++;
    } else {
      console.log(
        '  FAILED: Retry interval not set: ' + JSON.stringify(events),
      );
      failed++;
    }
    await stream.stop();
  } catch (error) {
    console.log('  FAILED: ' + error.message);
    failed++;
  }

  try {
    const port = getNextPort();
    console.log('\nTest 18: Stop cleans up all clients');
    const stream = new StatusStream({ port, heartbeatInterval: 60000 });
    await stream.start();

    const p1 = collectSSEEvents(port, 500);
    await new Promise((r) => setTimeout(r, 50));
    const p2 = collectSSEEvents(port, 500);
    await new Promise((r) => setTimeout(r, 50));
    const p3 = collectSSEEvents(port, 500);
    await new Promise((r) => setTimeout(r, 100));

    if (stream.getClientCount() >= 3) {
      await Promise.all([p1, p2, p3]);
      await stream.stop();
      if (stream.getClientCount() === 0) {
        console.log('  PASSED');
        passed++;
      } else {
        console.log(
          '  FAILED: Client count after stop is ' + stream.getClientCount(),
        );
        failed++;
      }
    } else {
      await Promise.all([p1, p2, p3]);
      console.log(
        '  FAILED: Client count before stop is ' +
          stream.getClientCount() +
          ', expected >= 3',
      );
      failed++;
    }
  } catch (error) {
    console.log('  FAILED: ' + error.message);
    failed++;
  }

  console.log('\n=== Test Summary ===');
  console.log('Passed: ' + passed + '/' + (passed + failed));
  console.log('Failed: ' + failed + '/' + (passed + failed));

  if (failed === 0) {
    console.log('\nAll tests passed!');
    process.exit(0);
  } else {
    console.log('\nSome tests failed');
    process.exit(1);
  }
}

runTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
