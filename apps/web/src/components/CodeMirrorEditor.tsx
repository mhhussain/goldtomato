import { useEffect, useRef } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import type { Extension } from '@codemirror/state';

/** Thin controlled wrapper around a CodeMirror 6 view. */
export function CodeMirrorEditor({
  value,
  onChange,
  extensions,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  extensions: Extension[];
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const view = new EditorView({
      doc: value,
      parent: containerRef.current!,
      extensions: [
        basicSetup,
        ...extensions,
        EditorView.updateListener.of((u) => {
          if (u.docChanged) onChangeRef.current(u.state.doc.toString());
        }),
      ],
    });
    viewRef.current = view;
    return () => view.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (view && view.state.doc.toString() !== value) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
    }
  }, [value]);

  return <div ref={containerRef} className={className} />;
}
