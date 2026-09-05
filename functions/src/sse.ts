import type { Response } from 'express';
import type { RunEvent } from '@goldtomato/protocol';

/**
 * SSE writer. Headers are flushed immediately so the client's getReader()
 * resolves before the first event (ADR-0001).
 */
export function createSseWriter(res: Response) {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();

  return {
    send(event: OutgoingEvent): void {
      if (res.writableEnded) return;
      const withTs = { ts: Date.now(), ...event } as RunEvent;
      res.write(`data: ${JSON.stringify(withTs)}\n\n`);
    },
    end(): void {
      if (!res.writableEnded) res.end();
    },
  };
}

// Omit must distribute over the RunEvent union, not collapse it.
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
type OutgoingEvent = DistributiveOmit<RunEvent, 'ts'> & { ts?: number };

export type SseWriter = ReturnType<typeof createSseWriter>;
