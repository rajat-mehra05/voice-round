import { expect, test } from 'vitest';
import { buildInterviewPrompt, buildFeedbackPrompt } from './prompts';

test('interviewer uses the candidate name when given a clean value, and addresses them in the system rules', () => {
  const prompt = buildInterviewPrompt({ topic: 'React', candidateName: 'Alice' });

  // Warm-intro rule references the name, and the constraints section reminds
  // the model to address the candidate by name.
  expect(prompt).toContain('Hey Alice, can you walk me through your work experience');
  expect(prompt).toContain("candidate's name is Alice");
});

test('malicious or empty-after-sanitize candidate names are dropped rather than leaking into the prompt', () => {
  // `!!!@@@` sanitises to empty. The prompt must fall back to the anonymous
  // greeting instead of emitting "Hey , how are you doing?".
  const prompt = buildInterviewPrompt({ topic: 'React', candidateName: '!!!@@@' });

  expect(prompt).toContain('Hey there, can you walk me through your work experience');
  expect(prompt).not.toContain("candidate's name is");
});

test('topic value flows into the prompt for both the greeting and the role description', () => {
  // `.` is not in the allow-list of the prompt sanitiser, so "Node.js" becomes
  // "Nodejs". The sanitiser behaviour itself is part of the contract — a test
  // expecting the dot would silently break when someone tightens sanitation.
  const prompt = buildInterviewPrompt({ topic: 'Node.js' });

  expect(prompt).toContain('Nodejs technical interview');
  expect(prompt).toContain('especially with Nodejs');
});

test('interview prompt injects scope guardrails when focus and outOfScope are provided', () => {
  const prompt = buildInterviewPrompt({
    topic: 'API Test Automation',
    focus: ['REST and GraphQL contract testing', 'auth flows'],
    outOfScope: ['UI or browser-based testing', 'load and performance testing'],
  });

  expect(prompt).toContain('Scope guardrails:');
  expect(prompt).toContain(
    'Stay strictly within these areas: REST and GraphQL contract testing; auth flows.',
  );
  expect(prompt).toContain(
    'Do not ask about: UI or browser-based testing; load and performance testing.',
  );
});

test('interview prompt renders only the focus line when outOfScope is omitted', () => {
  const prompt = buildInterviewPrompt({
    topic: 'API Test Automation',
    focus: ['REST and GraphQL contract testing'],
  });

  expect(prompt).toContain('Scope guardrails:');
  expect(prompt).toContain('Stay strictly within these areas:');
  expect(prompt).not.toContain('Do not ask about:');
});

test('interview prompt renders only the do-not-ask line when focus is omitted', () => {
  const prompt = buildInterviewPrompt({
    topic: 'API Test Automation',
    outOfScope: ['UI or browser-based testing'],
  });

  expect(prompt).toContain('Scope guardrails:');
  expect(prompt).toContain('Do not ask about:');
  expect(prompt).not.toContain('Stay strictly within these areas:');
});

test('interview prompt omits scope block when focus and outOfScope are absent', () => {
  // Topics without scope (Python, behavioral, etc.) must not get an empty
  // "Scope guardrails:" header — the LLM treats empty headers as a signal
  // that the constraint exists with unknown contents.
  const prompt = buildInterviewPrompt({ topic: 'Python' });
  expect(prompt).not.toContain('Scope guardrails:');
});

test('feedback prompt injects scope context when scope is provided', () => {
  const prompt = buildFeedbackPrompt({
    topic: 'API Test Automation',
    focus: ['REST and GraphQL contract testing'],
    outOfScope: ['UI or browser-based testing'],
  });

  expect(prompt).toContain('Scope context:');
  expect(prompt).toContain('This interview was scoped to: REST and GraphQL contract testing.');
  expect(prompt).toContain('explicitly out of scope: UI or browser-based testing.');
});

test('feedback prompt renders only the scoped-to line when outOfScope is omitted', () => {
  const prompt = buildFeedbackPrompt({
    topic: 'API Test Automation',
    focus: ['REST and GraphQL contract testing'],
  });

  expect(prompt).toContain('Scope context:');
  expect(prompt).toContain('This interview was scoped to:');
  expect(prompt).not.toContain('explicitly out of scope:');
});

test('feedback prompt renders only the out-of-scope line when focus is omitted', () => {
  const prompt = buildFeedbackPrompt({
    topic: 'API Test Automation',
    outOfScope: ['UI or browser-based testing'],
  });

  expect(prompt).toContain('Scope context:');
  expect(prompt).toContain('explicitly out of scope:');
  expect(prompt).not.toContain('This interview was scoped to:');
});

test('feedback prompt omits scope context when scope is absent', () => {
  const prompt = buildFeedbackPrompt({ topic: 'Python' });
  expect(prompt).not.toContain('Scope context:');
});

test('interview prompt teaches the LLM to interpret STT mishears charitably', () => {
  // This rule is the load-bearing fix for STT-mistranscribed library names
  // (e.g. "JustEnd" → "Zustand"). If the rule moves or disappears, the LLM
  // will start echoing mishearings back at the candidate.
  const prompt = buildInterviewPrompt({ topic: 'React' });
  expect(prompt).toContain('speech-to-text');
  expect(prompt).toContain('mistranscribed');
  expect(prompt).toContain('Never echo');
});

test('feedback prompt teaches the grader to interpret STT mishears charitably', () => {
  const prompt = buildFeedbackPrompt({ topic: 'React' });
  expect(prompt).toContain('speech-to-text');
  expect(prompt).toContain('mistranscribed');
  expect(prompt).toContain('never penalise');
});

test('interview prompt routes non-substantive replies to a soft skip', () => {
  // Filler responses ("yes", "okay") must not consume an archetype.
  const prompt = buildInterviewPrompt({ topic: 'React' });
  expect(prompt).toContain('non-substantive');
  expect(prompt).toContain('soft skip');
});
