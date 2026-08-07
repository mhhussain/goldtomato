import { javascript } from '@codemirror/lang-javascript';
import { CodeMirrorEditor } from './CodeMirrorEditor';

/**
 * Params for the Batch: a single JSON array of objects — one Params object
 * per Run. Fastest to build and most flexible (open question resolved in
 * favor of the textarea-style editor).
 */
export function ParamsEditor({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  return (
    <div className="flex min-h-0 flex-col">
      <div className="mb-1 text-xs font-medium text-zinc-400">
        Params — JSON array, one object per Run
      </div>
      <CodeMirrorEditor
        value={value}
        onChange={onChange}
        extensions={[javascript()]}
        className="h-32 overflow-auto rounded border border-zinc-700 bg-white text-sm"
      />
      {error && <div className="mt-1 text-xs text-red-400">{error}</div>}
    </div>
  );
}

export function parseParamsList(text: string): Array<Record<string, unknown>> {
  const parsed: unknown = JSON.parse(text);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('Params must be a non-empty JSON array of objects');
  }
  for (const p of parsed) {
    if (typeof p !== 'object' || p === null || Array.isArray(p)) {
      throw new Error('Each Params entry must be a JSON object');
    }
  }
  return parsed as Array<Record<string, unknown>>;
}
