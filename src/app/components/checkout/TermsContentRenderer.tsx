import React from "react";

export type EditorJsBlock = {
  id: string;
  type: string;
  data: {
    text?: string;
    level?: number;
    items?: string[];
    style?: "unordered" | "ordered";
    caption?: string;
    alignment?: string;
  };
};

interface TermsContentRendererProps {
  content: string | null | undefined;
}

export default function TermsContentRenderer({ content }: TermsContentRendererProps) {
  let blocks: EditorJsBlock[] = [];
  
  if (content) {
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed?.blocks)) {
        blocks = parsed.blocks as EditorJsBlock[];
        // Debug: Log parsed blocks to verify content structure
        console.log("Parsed content blocks:", blocks);
      }
    } catch (error) {
      console.error("Failed to parse content:", error);
    }
  }

  if (!blocks.length) {
    return (
      <div className="text-center py-8">
        <p className="text-[var(--color-secondary-600)] text-sm">
          Terms and conditions content not available.
        </p>
      </div>
    );
  }

  const renderBlock = (block: EditorJsBlock) => {
    const { type, data } = block;

    switch (type) {
      case "header": {
        const level = Math.min(Math.max(Number(data?.level) || 3, 1), 6);
        const headerClass = level <= 2 
          ? "text-xl font-semibold text-[var(--color-secondary-800)] mb-4"
          : "text-lg font-semibold text-[var(--color-secondary-800)] mb-3";
        
        return React.createElement(
          `h${level}`,
          {
            key: block.id,
            className: headerClass,
            dangerouslySetInnerHTML: { __html: data?.text || "" },
          }
        );
      }

      case "paragraph": {
        return (
          <p
            key={block.id}
            className="text-sm lg:text-base text-[var(--color-secondary-700)] leading-relaxed mb-6"
            dangerouslySetInnerHTML={{ __html: data?.text || "" }}
          />
        );
      }

      case "quote": {
        return (
          <blockquote
            key={block.id}
            className="border-l-4 border-[var(--color-primary-600)] pl-4 py-3 mb-6 bg-[var(--color-secondary-50)] rounded-r-md"
          >
            <p
              className="text-sm lg:text-base text-[var(--color-secondary-700)] italic font-medium"
              dangerouslySetInnerHTML={{ __html: data?.text || "" }}
            />
            {data?.caption && data.caption !== data.text && (
              <cite className="text-xs text-[var(--color-secondary-600)] mt-2 block">
                — {data.caption}
              </cite>
            )}
          </blockquote>
        );
      }

      case "list": {
        const items = data?.items || [];
        const isOrdered = data?.style === "ordered";
        
        const listClass = "mb-6 space-y-2";
        const itemClass = "text-sm lg:text-base text-[var(--color-secondary-700)] leading-relaxed pl-2";

        if (isOrdered) {
          return (
            <ol key={block.id} className={`${listClass} list-decimal list-inside pl-4`}>
              {items.map((item, index) => (
                <li
                  key={`${block.id}-${index}`}
                  className={itemClass}
                  dangerouslySetInnerHTML={{ __html: item }}
                />
              ))}
            </ol>
          );
        } else {
          return (
            <ul key={block.id} className={`${listClass} list-disc list-inside pl-4`}>
              {items.map((item, index) => (
                <li
                  key={`${block.id}-${index}`}
                  className={itemClass}
                  dangerouslySetInnerHTML={{ __html: item }}
                />
              ))}
            </ul>
          );
        }
      }

      default: {
        // Fallback for unknown block types
        return (
          <div
            key={block.id}
            className="text-sm lg:text-base text-[var(--color-secondary-700)] leading-relaxed mb-6"
            dangerouslySetInnerHTML={{ __html: data?.text || "" }}
          />
        );
      }
    }
  };

  return (
    <div className="max-w-none space-y-1">
      {blocks.map(renderBlock)}
    </div>
  );
}