import { MockMCPAgentMailServer } from './mocks/mcp-agent-mail-mock.js';

const USE_MOCK = process.env.USE_MOCK !== 'false';
const USE_REAL_MCP = process.env.USE_REAL_MCP === 'true';

let mockServer;
let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    testsPassed++;
  } else {
    console.log(`  ✗ ${message}`);
    testsFailed++;
  }
}

async function runTests() {
  console.log('\n=== MCP Communication Tests ===\n');

  if (USE_MOCK && !USE_REAL_MCP) {
    console.log('Using Mock MCP Server\n');
    mockServer = new MockMCPAgentMailServer();
    await mockServer.start();
  } else {
    console.log('Using Real MCP Server (not implemented in this test)\n');
    return;
  }

  await testBasicRegistration();
  await testMessageSending();
  await testInboxFetching();
  await testErrorHandling();
  await testFaultInjection();
  await testLatencyConfiguration();

  await mockServer.stop();

  console.log('\n=== Test Summary ===');
  console.log(`Passed: ${testsPassed}`);
  console.log(`Failed: ${testsFailed}`);
  console.log('');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

async function testBasicRegistration() {
  console.log('Test: Basic Agent Registration');
  mockServer.clear();

  const result = await mockServer.register_agent({
    agentId: 'test-agent',
    name: 'Test Agent',
    endpoint: 'http://localhost:3001',
  });

  assert(result.agentId === 'test-agent', 'Agent registered with correct ID');
  assert(result.name === 'Test Agent', 'Agent registered with correct name');
  assert(mockServer.getRegisteredAgents().length === 1, 'One agent registered');
}

async function testMessageSending() {
  console.log('\nTest: Message Sending');
  mockServer.clear();

  await mockServer.register_agent({
    agentId: 'sender',
    name: 'Sender',
    endpoint: 'http://localhost:3001',
  });
  await mockServer.register_agent({
    agentId: 'receiver',
    name: 'Receiver',
    endpoint: 'http://localhost:3002',
  });

  const result = await mockServer.send_message({
    fromAgentId: 'sender',
    toAgentId: 'receiver',
    subject: 'Test Message',
    body: 'Hello, this is a test message',
  });

  assert(result.messageId.startsWith('msg_'), 'Message has ID');
  assert(result.fromAgentId === 'sender', 'Message has correct sender');
  assert(result.toAgentId === 'receiver', 'Message has correct receiver');
  assert(result.subject === 'Test Message', 'Message has correct subject');
  assert(mockServer.getMessages().length === 1, 'One message stored');
}

async function testInboxFetching() {
  console.log('\nTest: Inbox Fetching');
  mockServer.clear();

  await mockServer.register_agent({
    agentId: 'agent1',
    name: 'Agent 1',
    endpoint: 'http://localhost:3001',
  });
  await mockServer.register_agent({
    agentId: 'agent2',
    name: 'Agent 2',
    endpoint: 'http://localhost:3002',
  });

  await mockServer.send_message({
    fromAgentId: 'agent2',
    toAgentId: 'agent1',
    subject: 'Msg 1',
    body: 'First',
  });
  await mockServer.send_message({
    fromAgentId: 'agent2',
    toAgentId: 'agent1',
    subject: 'Msg 2',
    body: 'Second',
  });
  await mockServer.send_message({
    fromAgentId: 'agent1',
    toAgentId: 'agent2',
    subject: 'Msg 3',
    body: 'Third',
  });

  const inbox = await mockServer.fetch_inbox({ agentId: 'agent1' });
  assert(inbox.length === 2, 'Agent 1 received 2 messages');

  const inboxWithLimit = await mockServer.fetch_inbox({
    agentId: 'agent1',
    options: { limit: 1 },
  });
  assert(inboxWithLimit.length === 1, 'Limit option works');
}

async function testErrorHandling() {
  console.log('\nTest: Error Handling');
  mockServer.clear();

  try {
    await mockServer.send_message({
      fromAgentId: 'unknown',
      toAgentId: 'receiver',
      subject: 'Test',
      body: 'Test',
    });
    assert(false, 'Should have thrown error for unregistered sender');
  } catch (e) {
    assert(
      e.message.includes('not registered'),
      'Error for unregistered sender',
    );
  }

  mockServer.register_agent({
    agentId: 'sender',
    name: 'Sender',
    endpoint: 'http://localhost:3001',
  });

  try {
    await mockServer.send_message({
      fromAgentId: 'sender',
      toAgentId: 'unknown',
      subject: 'Test',
      body: 'Test',
    });
    assert(false, 'Should have thrown error for unregistered recipient');
  } catch (e) {
    assert(
      e.message.includes('not registered'),
      'Error for unregistered recipient',
    );
  }
}

async function testFaultInjection() {
  console.log('\nTest: Fault Injection');
  mockServer.clear();
  mockServer.setFaults({ enabled: true, errorRate: 1.0, timeoutRate: 0 });

  let errorsInjected = 0;
  mockServer.on('error', () => {
    errorsInjected++;
  });

  try {
    await mockServer.register_agent({
      agentId: 'test',
      name: 'Test',
      endpoint: 'http://localhost:3001',
    });
  } catch (e) {
    errorsInjected++;
    assert(e.message.includes('Simulated'), 'Fault injection produces error');
  }

  mockServer.setFaults({ enabled: false });
}

async function testLatencyConfiguration() {
  console.log('\nTest: Latency Configuration');
  mockServer.clear();

  mockServer.setLatency({ min: 10, max: 20 });

  const start = Date.now();
  await mockServer.register_agent({
    agentId: 'latency-test',
    name: 'Latency Test',
    endpoint: 'http://localhost:3001',
  });
  const elapsed = Date.now() - start;

  assert(elapsed >= 10, `Latency minimum respected (${elapsed}ms >= 10ms)`);
  assert(
    elapsed <= 50,
    `Latency within reasonable bounds (${elapsed}ms <= 50ms)`,
  );
}

runTests().catch((e) => {
  console.error('Test runner failed:', e);
  process.exit(1);
});
