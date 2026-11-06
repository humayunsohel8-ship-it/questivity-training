import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

/** Renders trusted-author markdown. Raw HTML is not rendered (react-markdown default). */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div
      className={cn(
        "prose prose-slate max-w-none prose-headings:font-display prose-headings:text-brand-ink",
        "prose-a:text-brand prose-code:rounded prose-code:bg-brand-light/60 prose-code:px-1 prose-code:py-0.5",
        "prose-code:before:content-none prose-code:after:content-none prose-pre:bg-brand-ink prose-pre:text-white",
        "prose-table:text-sm prose-th:bg-brand-surface prose-blockquote:border-brand-accent",
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
