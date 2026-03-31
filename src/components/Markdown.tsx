import { lazy, Suspense, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const SyntaxHighlighter = lazy(() =>
  import('react-syntax-highlighter/dist/esm/prism-light').then((mod) => ({ default: mod.default }))
);

const loadTheme = () => import('react-syntax-highlighter/dist/esm/styles/prism/one-dark').then((m) => m.default);

let cachedTheme: Record<string, React.CSSProperties> | null = null;
const getTheme = () => {
  if (!cachedTheme) {
    loadTheme().then((t) => { cachedTheme = t; });
  }
  return cachedTheme || {};
};

const langImports: Record<string, () => Promise<any>> = {
  javascript: () => import('react-syntax-highlighter/dist/esm/languages/prism/javascript'),
  typescript: () => import('react-syntax-highlighter/dist/esm/languages/prism/typescript'),
  python: () => import('react-syntax-highlighter/dist/esm/languages/prism/python'),
  bash: () => import('react-syntax-highlighter/dist/esm/languages/prism/bash'),
  json: () => import('react-syntax-highlighter/dist/esm/languages/prism/json'),
  yaml: () => import('react-syntax-highlighter/dist/esm/languages/prism/yaml'),
  jsx: () => import('react-syntax-highlighter/dist/esm/languages/prism/jsx'),
  tsx: () => import('react-syntax-highlighter/dist/esm/languages/prism/tsx'),
};

const registeredLangs = new Set<string>();

function registerLang(lang: string) {
  if (registeredLangs.has(lang) || !langImports[lang]) return;
  registeredLangs.add(lang);
  langImports[lang]().then((mod) => {
    import('react-syntax-highlighter/dist/esm/prism-light').then((SH) => {
      SH.default.registerLanguage(lang, mod.default);
    });
  });
}

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 px-2 py-1 rounded text-xs bg-[#222] text-[#888] hover:text-white hover:bg-[#333] transition-colors cursor-pointer"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

interface Props {
  text: string;
}

export default function Markdown({ text }: Props) {
  return (
    <div className="prose-custom">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a({ href, children, ...props }) {
            return (
              <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
                {children}
              </a>
            );
          },
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const code = String(children).replace(/\n$/, '');

            if (match) {
              const lang = match[1];
              registerLang(lang);

              return (
                <div className="relative group">
                  <CopyButton code={code} />
                  <Suspense fallback={<pre><code>{code}</code></pre>}>
                    <SyntaxHighlighter
                      style={getTheme()}
                      language={lang}
                      customStyle={{
                        margin: '10px 0',
                        borderRadius: '8px',
                        fontSize: '0.88em',
                        border: '1px solid #1a1a1a',
                      }}
                    >
                      {code}
                    </SyntaxHighlighter>
                  </Suspense>
                </div>
              );
            }

            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
