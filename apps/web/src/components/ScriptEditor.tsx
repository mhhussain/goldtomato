import { javascript } from '@codemirror/lang-javascript';
import { CodeMirrorEditor } from './CodeMirrorEditor';

export function ScriptEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-1 text-xs font-medium text-zinc-400">
        Script — async body with <code className="text-zinc-300">page</code>,{' '}
        <code className="text-zinc-300">params</code>, <code className="text-zinc-300">log</code> in scope
      </div>
      <CodeMirrorEditor
        value={value}
        onChange={onChange}
        extensions={[javascript()]}
        className="min-h-0 flex-1 overflow-auto rounded border border-zinc-700 bg-white text-sm"
      />
    </div>
  );
}
