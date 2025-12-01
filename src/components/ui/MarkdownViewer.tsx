import Markdown from 'markdown-to-jsx';

interface MarkdownViewerProps {
  content: string;
  className?: string;
}

export function MarkdownViewer({ content, className = '' }: MarkdownViewerProps) {
  return (
    <div className={className}>
      <Markdown options={{ forceBlock: true, disableParsingRawHTML: true }}>
        {content}
      </Markdown>
    </div>
  );
}
