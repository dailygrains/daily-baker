'use client';

import {
  MDXEditor as BaseMDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  linkPlugin,
  linkDialogPlugin,
  tablePlugin,
  codeBlockPlugin,
  codeMirrorPlugin,
  diffSourcePlugin,
  toolbarPlugin,
  UndoRedo,
  BoldItalicUnderlineToggles,
  CodeToggle,
  ListsToggle,
  CreateLink,
  InsertTable,
  InsertThematicBreak,
  BlockTypeSelect,
  type MDXEditorMethods,
} from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';
import { forwardRef, useSyncExternalStore } from 'react';

const subscribeNoop = () => () => {};

type MDXEditorProps = {
  markdown: string;
  onChange?: (markdown: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
};

export const MDXEditor = forwardRef<MDXEditorMethods, MDXEditorProps>(
  ({ markdown, onChange, placeholder, readOnly = false, className = '' }, ref) => {
    // false during SSR and hydration, true once running on the client
    const isMounted = useSyncExternalStore(subscribeNoop, () => true, () => false);

    // Don't render on server to avoid hydration mismatch from platform detection
    if (!isMounted) {
      return (
        <div className={`mdx-editor-wrapper ${className}`}>
          <div className="min-h-[200px] border border-base-300 rounded-lg bg-base-100 animate-pulse" />
        </div>
      );
    }

    return (
      <div className={`mdx-editor-wrapper ${className}`}>
        <BaseMDXEditor
          ref={ref}
          markdown={markdown}
          onChange={onChange}
          placeholder={placeholder}
          readOnly={readOnly}
          contentEditableClassName="prose max-w-none"
          plugins={[
            headingsPlugin(),
            listsPlugin(),
            quotePlugin(),
            thematicBreakPlugin(),
            markdownShortcutPlugin(),
            linkPlugin(),
            linkDialogPlugin(),
            tablePlugin(),
            codeBlockPlugin({ defaultCodeBlockLanguage: 'js' }),
            codeMirrorPlugin({
              codeBlockLanguages: {
                js: 'JavaScript',
                ts: 'TypeScript',
                tsx: 'TypeScript (React)',
                jsx: 'JavaScript (React)',
                css: 'CSS',
                html: 'HTML',
                json: 'JSON',
                python: 'Python',
                bash: 'Bash',
                shell: 'Shell',
              },
            }),
            diffSourcePlugin({ viewMode: 'rich-text', diffMarkdown: markdown }),
            toolbarPlugin({
              toolbarContents: () => (
                <>
                  <UndoRedo />
                  <BoldItalicUnderlineToggles />
                  <CodeToggle />
                  <ListsToggle />
                  <BlockTypeSelect />
                  <CreateLink />
                  <InsertTable />
                  <InsertThematicBreak />
                </>
              ),
            }),
          ]}
        />
      </div>
    );
  }
);

MDXEditor.displayName = 'MDXEditor';
