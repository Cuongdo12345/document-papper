import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * DEV-075/FE-26 — mapping thủ công heading/table/code/link sang token màu +
 * type scale SẴN CÓ của project (`text-foreground`, `text-muted-foreground`,
 * `border-border`, `bg-muted`, `text-primary`...) — KHÔNG cài thêm
 * `@tailwindcss/typography` (`prose` class) vì đó là dependency thứ 3 ngoài
 * phạm vi đã duyệt (chỉ `react-markdown` + `remark-gfm`, xem `DEV-075.md`).
 */
const components: Components = {
  h1: ({ children }) => <h1 className="mb-4 text-2xl font-bold text-foreground">{children}</h1>,
  h2: ({ children }) => <h2 className="mt-6 mb-3 text-xl font-semibold text-foreground">{children}</h2>,
  h3: ({ children }) => <h3 className="mt-5 mb-2 text-lg font-semibold text-foreground">{children}</h3>,
  h4: ({ children }) => <h4 className="mt-4 mb-2 text-base font-semibold text-foreground">{children}</h4>,
  p: ({ children }) => <p className="mb-3 text-sm leading-relaxed text-foreground">{children}</p>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-primary underline-offset-2 hover:underline">
      {children}
    </a>
  ),
  ul: ({ children }) => <ul className="mb-3 list-inside list-disc space-y-1 text-sm text-foreground">{children}</ul>,
  ol: ({ children }) => <ol className="mb-3 list-inside list-decimal space-y-1 text-sm text-foreground">{children}</ol>,
  li: ({ children }) => <li className="text-sm text-foreground">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="mb-3 border-l-2 border-border pl-3 text-sm text-muted-foreground italic">{children}</blockquote>
  ),
  hr: () => <hr className="my-6 border-border" />,
  code: ({ children, className }) =>
    className ? (
      <code className={className}>{children}</code>
    ) : (
      <code className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[12px] text-foreground">{children}</code>
    ),
  pre: ({ children }) => (
    <pre className="mb-3 overflow-x-auto rounded-md border border-border bg-muted p-3 font-mono text-[12px] text-foreground">{children}</pre>
  ),
  table: ({ children }) => (
    <div className="mb-3 overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-muted">{children}</thead>,
  th: ({ children }) => <th className="border border-border px-2 py-1 text-left font-semibold text-foreground">{children}</th>,
  td: ({ children }) => <td className="border border-border px-2 py-1 text-foreground">{children}</td>,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
};

interface ProjectDocMarkdownProps {
  content: string;
}

/** DEV-075/FE-26 — render markdown thô (GFM: bảng/strikethrough/task-list) từ `GET /api/project-docs/:id`. */
export function ProjectDocMarkdown({ content }: ProjectDocMarkdownProps) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  );
}
