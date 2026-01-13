import { createHash } from 'crypto';

export function normalizeStackTrace(stackTrace) {
  const lines = stackTrace.split('\n');
  const relevantLines = lines.filter(
    (line) =>
      line.trim() &&
      !line.startsWith('    ') &&
      !line.startsWith('at ') &&
      !line.includes('node_modules/'),
  );

  return relevantLines.join('\n');
}

export function calculateFingerprint(errorType, stackTrace, agent, stage) {
  const normalizedTrace = normalizeStackTrace(stackTrace);
  const dataString = `${errorType}:${normalizedTrace}:${agent}:${stage}`;

  return createHash('sha256').update(dataString).digest('hex');
}

export async function checkExistingFixTask(fingerprint, beadsClient) {
  const tasks = await beadsClient.list({
    filters: JSON.stringify({ title: fingerprint }),
  });

  return tasks.find(
    (t) => t.title.includes(fingerprint) && t.status === 'open',
  );
}

export function updateFingerprintFrequency(fingerprintMap, newFingerprint) {
  if (!fingerprintMap.has(newFingerprint)) {
    fingerprintMap.set(newFingerprint, { count: 1, lastSeen: Date.now() });
  } else {
    const existing = fingerprintMap.get(newFingerprint);
    existing.count++;
    existing.lastSeen = Date.now();
  }
}
