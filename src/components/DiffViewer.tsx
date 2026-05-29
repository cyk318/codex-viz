import ReactDiffViewer from 'react-diff-viewer-continued';

export function DiffViewer({ patch }: { patch: string }) {
  return (
    <ReactDiffViewer
      oldValue=""
      newValue={patch}
      splitView={false}
      useDarkTheme={window.matchMedia('(prefers-color-scheme: dark)').matches}
    />
  );
}
