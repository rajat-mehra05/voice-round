import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Info } from 'lucide-react';
import { TOPIC_LABELS, DEFAULT_QUESTION_COUNT, toValidTopic } from '@/constants/topics';
import { useInterviewSession } from '@/hooks/useInterviewSession/useInterviewSession';
import { useQuitGuard } from '@/hooks/useQuitGuard/useQuitGuard';
import { trackEvent } from '@/lib/analytics';
import { SessionHeader } from './SessionHeader';
import { StopDialog } from './StopDialog';
import { ConversationLog } from './ConversationLog';
import { StatusIndicator } from './StatusIndicator';
import { RecordingTimer } from './RecordingTimer';
import { SessionErrorDisplay } from './SessionErrorDisplay';
import { MicCheckGate } from './MicCheckGate';
import type { InterviewState } from '@/hooks/useInterviewSession/types';

// Statuses where the session is not actively engaging the user. The Stop
// button additionally hides during 'skipping' (the auto-advance window
// where Stop would be confusing).
const INACTIVE_STATUSES: readonly InterviewState[] = [
  'idle',
  'completed',
  'error',
  'generating_feedback',
];

export function Session() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const topic = toValidTopic(searchParams.get('topic'));
  const rawCount = Number(searchParams.get('count'));
  const count =
    Number.isFinite(rawCount) && rawCount > 0 ? rawCount : Number(DEFAULT_QUESTION_COUNT);
  const topicLabel = TOPIC_LABELS[topic] ?? topic;
  const candidateName = searchParams.get('name') ?? '';
  const { state, start, stop, retry, stopRecordingOnly } = useInterviewSession();
  const startedRef = useRef(false);
  const [stopDialogOpen, setStopDialogOpen] = useState(false);
  const answeredCount = state.history.length;

  const handleMicReady = useCallback(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    start({ topic, topicLabel, questionCount: count, candidateName: candidateName || undefined });
  }, [start, topic, topicLabel, count, candidateName]);

  const handleMaxRecording = useCallback(() => {
    stopRecordingOnly();
  }, [stopRecordingOnly]);

  // Warn before quit while the mic is capturing; `user_recording` is
  // exactly the "lose the in-flight answer" window.
  useQuitGuard(
    state.status === 'user_recording',
    'A recording is in progress. Close anyway? The current answer will be lost.',
  );

  const handleRestart = useCallback(() => {
    startedRef.current = true;
    start({ topic, topicLabel, questionCount: count, candidateName: candidateName || undefined });
  }, [start, topic, topicLabel, count, candidateName]);

  // Warn on navigation away during active session
  useEffect(() => {
    const active = !['idle', 'completed', 'error'].includes(state.status);
    if (!active) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [state.status]);

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <SessionHeader
        topicLabel={topicLabel}
        currentIndex={state.currentQuestionIndex}
        totalCount={count}
      />

      <MicCheckGate onReady={handleMicReady}>
        {!INACTIVE_STATUSES.includes(state.status) && (
          <div
            role="note"
            aria-live="polite"
            className="flex w-full max-w-2xl items-start gap-2 border-2 border-black bg-neo-secondary/50 px-3 py-2 text-xs font-medium text-black shadow-neo-sm"
          >
            <Info className="mt-[1px] h-4 w-4 shrink-0" aria-hidden="true" strokeWidth={2.5} />
            <span>
              Keep this tab focused for the smoothest run. Switching windows may slow audio capture
              and the auto-advance between questions.
            </span>
          </div>
        )}

        <ConversationLog
          history={state.history}
          currentQuestion={state.currentQuestion}
          ttsFallbackText={state.ttsFallbackText}
        />

        <StatusIndicator
          status={state.status}
          questionIndex={state.currentQuestionIndex}
          currentQuestion={state.currentQuestion}
          isPartial={state.isPartial}
        />

        <RecordingTimer
          isActive={state.status === 'user_recording'}
          onMaxReached={handleMaxRecording}
        />

        {state.status === 'error' && state.error && (
          <SessionErrorDisplay error={state.error} onRetry={retry} onRestart={handleRestart} />
        )}

        {state.status === 'completed' && state.isPartial && !state.sessionId && (
          <Link
            to="/"
            className="inline-block border-4 border-black bg-neo-accent px-6 py-3 text-sm font-bold uppercase tracking-wide text-black shadow-neo transition-all duration-100 hover:-translate-y-0.5 hover:shadow-neo-md focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
          >
            Back to Home
          </Link>
        )}

        {!INACTIVE_STATUSES.includes(state.status) && state.status !== 'skipping' && (
          <button
            onClick={() => setStopDialogOpen(true)}
            aria-label="Stop interview"
            className="flex h-20 w-20 cursor-pointer items-center justify-center border-4 border-black bg-neo-accent text-sm font-bold uppercase tracking-wide text-black shadow-neo transition-all duration-100 hover:-translate-y-0.5 hover:shadow-neo-md focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
          >
            Stop
          </button>
        )}

        <StopDialog
          open={stopDialogOpen}
          onOpenChange={setStopDialogOpen}
          answeredCount={answeredCount}
          totalCount={count}
          onLeave={() => {
            setStopDialogOpen(false);
            void trackEvent('interview_abandoned', { topic: topicLabel });
            void navigate('/history');
          }}
          onEndEarly={() => {
            setStopDialogOpen(false);
            stop();
          }}
        />
      </MicCheckGate>
    </div>
  );
}
