import test from 'node:test';
import assert from 'node:assert/strict';
import { helpFaqs, manualRecoverySteps, SUPPORT_EMAIL, SUPPORT_MAILTO } from '../src/lib/supportContent.js';

test('uses the approved support destination without inventing a fallback address', () => {
  assert.equal(SUPPORT_EMAIL, 'nduryamuhammad6@gmail.com');
  assert.equal(SUPPORT_MAILTO, 'mailto:nduryamuhammad6@gmail.com?subject=PlanSoko%20support%20request');
});

test('help content covers the F14 support topics', () => {
  const topics = helpFaqs.map(topic => topic.id);
  assert.deepEqual(topics, ['payment', 'downloads', 'licensing', 'designer-review']);
  assert.ok(helpFaqs.every(topic => topic.question && topic.answer));
});

test('manual recovery protects credentials and verifies entitlement server-side', () => {
  const recovery = manualRecoverySteps.join(' ');
  assert.match(recovery, /order reference/i);
  assert.match(recovery, /server/i);
  assert.match(recovery, /M-Pesa PIN/i);
  assert.match(recovery, /cannot promise paid-file access/i);
});
