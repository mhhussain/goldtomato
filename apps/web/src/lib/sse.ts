import type { RunEvent, RunRequest } from '@goldtomato/protocol';
import { RUN_FN_URL } from '../config';

/**
 * One Run = one POST + hand-rolled SSE parse over fetch/ReadableStream.
 * EventSource is unusable here: GET-only and can't send Authorization.
 *
 * Resolves when the stream closes. `sawDone` tells the caller whether the
 * server sent a terminal `done` — stream-close-without-done is abnormal.
 */
export async function streamRun(
  request: RunRequest,
  idToken: string,
  onEvent: (e: RunEvent) => void,
  signal: AbortSignal,
): Promise<{ sawDone: boolean }> {
  const res = await fetch(RUN_FN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(request),
    signal,
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '');
    throw new Error(`Run request failed (${res.status}): ${text}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let sawDone = false;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const frames = buf.split('\n\n');
    buf = frames.pop() ?? ''; // keep the trailing partial frame
    for (const f of frames) {
      if (!f.startsWith('data: ')) continue;
      const event = JSON.parse(f.slice(6)) as RunEvent;
      if (event.type === 'done') sawDone = true;
      onEvent(event);
    }
  }

  return { sawDone };
}
