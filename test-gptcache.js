const GPTCacheClient = require('./lib/gptcache-client');

const client = new GPTCacheClient('127.0.0.1', 8000);

async function testCache() {
  console.log('Testing GPTCache connection...\n');

  const testPrompt = 'What is 2+2?';
  const testAnswer = '4';

  console.log('1. Testing PUT (store prompt-answer pair)');
  const putResult = await client.put(testPrompt, testAnswer);
  console.log('   PUT result:', putResult);
  console.log('');

  console.log('2. Testing GET (retrieve by prompt)');
  const getResult = await client.get(testPrompt);
  console.log('   GET result:', getResult);
  console.log('');

  if (getResult?.answer) {
    console.log('✅ Cache is working!');
    console.log(`   Prompt: "${testPrompt}"`);
    console.log(`   Answer: "${getResult.answer}"`);
  } else {
    console.log('❌ Cache not working properly');
  }
}

testCache().catch(console.error);
