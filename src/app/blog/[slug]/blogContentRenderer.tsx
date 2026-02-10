import React from "react";
import Link from "next/link";

export type EditorJsBlock = {
  id: string;
  type: string;
  data: {
    text?: string;
    level?: number;
    style?: "ordered" | "unordered";
    items?: string[];
  };
};

// Helper function to decode HTML entities
function decodeHtmlEntities(text: string): string {
  const textarea =
    typeof document !== "undefined" ? document.createElement("textarea") : null;

  if (textarea) {
    textarea.innerHTML = text;
    return textarea.value;
  }

  // Fallback for server-side rendering
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

// Helper function to check if text contains HTML table elements
function isTableFragment(text: string): boolean {
  const tablePatterns = [
    /<table/i,
    /<\/table>/i,
    /<thead/i,
    /<\/thead>/i,
    /<tbody/i,
    /<\/tbody>/i,
    /<tr/i,
    /<\/tr>/i,
    /<td/i,
    /<\/td>/i,
    /<th/i,
    /<\/th>/i,
    /<colgroup/i,
    /<\/colgroup>/i,
    /<col/i,
  ];
  return tablePatterns.some((pattern) => pattern.test(text));
}

// Helper function to merge table fragments
function mergeTableBlocks(blocks: EditorJsBlock[]): EditorJsBlock[] {
  const merged: EditorJsBlock[] = [];
  let tableBuffer: string[] = [];
  let tableStartId: string | null = null;
  let isInTable = false;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const text = block.data?.text || "";
    const decodedText = decodeHtmlEntities(text);

    // Check if this starts a table
    if (/<table/i.test(decodedText)) {
      isInTable = true;
      tableStartId = block.id;
    }

    if (
      block.type === "paragraph" &&
      (isInTable || isTableFragment(decodedText))
    ) {
      // Start or continue accumulating table content
      if (!tableStartId) {
        tableStartId = block.id;
        isInTable = true;
      }

      // Clean up individual fragments: remove <br> tags and preserve whitespace
      const cleanedText = decodedText
        .replace(/<br\s*\/?>/gi, "")
        .replace(/^\s+|\s+$/g, ""); // Trim leading/trailing whitespace only

      if (cleanedText) {
        tableBuffer.push(cleanedText);
      }

      // Check if this closes the table
      if (/<\/table>/i.test(decodedText)) {
        isInTable = false;
        // Create merged table block
        const mergedHTML = tableBuffer.join("");
        merged.push({
          id: tableStartId || block.id,
          type: "table",
          data: {
            text: mergedHTML,
          },
        });
        tableBuffer = [];
        tableStartId = null;
      }
    } else {
      // If we have accumulated table content, create a merged block
      if (tableBuffer.length > 0 && tableStartId) {
        // Join without extra newlines to preserve HTML structure
        const mergedHTML = tableBuffer.join("");
        merged.push({
          id: tableStartId,
          type: "table",
          data: {
            text: mergedHTML,
          },
        });
        tableBuffer = [];
        tableStartId = null;
        isInTable = false;
      }
      // Add the non-table block
      merged.push(block);
    }
  }

  // Handle any remaining table content
  if (tableBuffer.length > 0 && tableStartId) {
    const mergedHTML = tableBuffer.join("");
    merged.push({
      id: tableStartId,
      type: "table",
      data: {
        text: mergedHTML,
      },
    });
  }

  return merged;
}

export default function BlogEditorRenderer({
  content,
}: {
  content: string | null | undefined;
}) {
  let blocks: EditorJsBlock[] = [];
  if (content) {
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed?.blocks)) {
        blocks = parsed.blocks as EditorJsBlock[];
      }
    } catch (_) {}
  }

  if (!blocks.length) {
    return (
      <div className="w-full p-6">
        <h2 className="text-xl font-semibold">Call for Availability</h2>
      </div>
    );
  }

  // Merge table fragments before rendering
  const mergedBlocks = mergeTableBlocks(blocks);

  const renderBlock = (block: EditorJsBlock) => {
    const { type, data } = block;
    const html = decodeHtmlEntities(data?.text || "");

    switch (type) {
      case "table":
        return (
          <div
            key={block.id}
            className="table-wrapper my-6"
            dangerouslySetInnerHTML={{ __html: data?.text || "" }}
          />
        );
      case "header": {
        const level = Math.min(Math.max(Number(data?.level) || 3, 1), 6);
        return React.createElement(`h${level}`, {
          key: block.id,
          className: "text-2xl font-semibold leading-8 tracking-[-0.06px] my-6",
          dangerouslySetInnerHTML: { __html: html },
        });
      }
      case "list": {
        const style = data?.style || "unordered";
        const items = Array.isArray(data?.items) ? data.items : [];
        const ListTag = style === "ordered" ? "ol" : "ul";
        const listClassName =
          style === "ordered"
            ? "list-decimal list-inside my-4 space-y-2 text-lg leading-7 tracking-[-0.045px]"
            : "list-disc list-inside my-4 space-y-2 text-lg leading-7 tracking-[-0.045px]";

        return (
          <ListTag key={block.id} className={listClassName}>
            {items.map((item, idx) => (
              <li
                key={`${block.id}-${idx}`}
                dangerouslySetInnerHTML={{ __html: decodeHtmlEntities(item) }}
              />
            ))}
          </ListTag>
        );
      }
      case "paragraph":
      default:
        // Check if this paragraph contains table HTML that wasn't merged
        if (isTableFragment(html)) {
          return (
            <div
              key={block.id}
              className="table-wrapper my-6"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        }
        return (
          <p
            key={block.id}
            className="text-lg leading-7 tracking-[-0.045px] my-4"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
    }
  };

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
          .editor-content a {
            color: #e6c200;
            text-decoration: underline;
            transition: opacity 0.2s;
          }
        
          .editor-content strong,
          .editor-content b {
            font-weight: 600;
          }
          .editor-content em,
          .editor-content i {
            font-style: italic;
          }
          .editor-content a {
            max-width: 40%;
          }
          .editor-content img {
            max-width: 40%;
          }
          .editor-content table {
            width: 100% !important;
            max-width: 100% !important;
            border-collapse: collapse;
            margin: 2rem 0;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            display: table;
            table-layout: auto !important;
          }
          .editor-content .table-wrapper {
            width: 100%;
            overflow-x: auto;
          }
          .editor-content table col {
            width: auto !important;
          }
          .editor-content table colgroup {
            display: table-column-group;
          }
          .editor-content table thead {
            background-color: var(--color-primary-600);
            color: white;
          }
          .editor-content table th,
          .editor-content table td {
            padding: 1rem 1.5rem;
            text-align: left;
            border: 1px solid var(--color-secondary-300);
            line-height: 1.6;
          }
          .editor-content table th {
            font-weight: 600;
            font-size: 1rem;
          }
          .editor-content table tbody tr:nth-child(even) {
            background-color: var(--color-secondary-50);
          }
          .editor-content .table-header {
            font-weight: 600;
            font-size: 1.1rem;
            padding: 1.25rem 1.5rem;
          }
          .editor-content .table-data {
            font-size: 0.95rem;
            padding: 0.875rem 1.25rem;
          }
          .ezo-table {
            width: 100%;
            border-collapse: collapse;
            margin: 2rem 0;
          }
          @media (max-width: 768px) {
            .editor-content table {
              font-size: 0.875rem;
            }
            .editor-content table th,
            .editor-content table td {
              padding: 0.75rem 1rem;
            }
          }
        `,
        }}
      />
      <div className="editor-content overflow-x-auto">
        {mergedBlocks.map(renderBlock)}
      </div>
    </>
  );
}
