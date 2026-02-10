import React from "react";

export type EditorJsParagraphBlock = { id?: string; type: "paragraph"; data: { text?: string } };
export type EditorJsHeaderBlock = { id?: string; type: "header"; data: { text?: string; level?: number } };
export type EditorJsListBlock = { id?: string; type: "list"; data: { style?: "ordered" | "unordered"; items?: string[] } };
export type EditorJsQuoteBlock = { id?: string; type: "quote"; data: { text?: string; caption?: string; alignment?: string } };
export type EditorJsLinkBlock = { id?: string; type: "linkTool"; data: { link?: string; meta?: { title?: string; description?: string; image?: { url?: string } } } };
export type EditorJsImageBlock = { id?: string; type: "image"; data: { file?: { url?: string }; caption?: string; withBorder?: boolean; withBackground?: boolean; stretched?: boolean } };
export type EditorJsDelimiterBlock = { id?: string; type: "delimiter"; data?: Record<string, unknown> };
export type EditorJsTableBlock = { id?: string; type: "table"; data: { withHeadings?: boolean; content?: string[][] } };
export type EditorJsCodeBlock = { id?: string; type: "code"; data: { code?: string } };
export type EditorJsGenericBlock = { id?: string; type: string; data?: Record<string, unknown> | null };
export type EditorJsBlock =
  | EditorJsParagraphBlock
  | EditorJsHeaderBlock
  | EditorJsListBlock
  | EditorJsQuoteBlock
  | EditorJsLinkBlock
  | EditorJsImageBlock
  | EditorJsDelimiterBlock
  | EditorJsTableBlock
  | EditorJsCodeBlock
  | EditorJsGenericBlock;
export type EditorJsDoc = { time?: number; blocks?: EditorJsBlock[]; version?: string };

export function parseEditorJsToSections(content: string | null | undefined) {
  if (!content) return null;
  try {
    const parsed = JSON.parse(content) as EditorJsDoc;
    const blocks = parsed.blocks || [];
    if (!blocks.length) return null;

    const sections: Array<{ title: string; description: React.ReactNode }> = [];
    let currentTitle = "";
    let currentContent: React.ReactNode[] = [];

    const flushCurrentSection = () => {
      if (currentTitle && currentContent.length > 0) {
        sections.push({
          title: currentTitle,
          description: (
            <div className="space-y-4 [&_a]:text-blue-600 [&_a]:underline [&_a]:font-medium [&_a:hover]:text-blue-800 [&_a:hover]:no-underline [&_a]:transition-colors [&_a]:duration-200">
              {currentContent.map((content, idx) => (
                <div key={idx}>{content}</div>
              ))}
            </div>
          )
        });
        currentContent = [];
      }
    };

    blocks.forEach((b: EditorJsBlock, idx: number) => {
      const key = b.id || String(idx);
      
      if (b.type === "header") {
        const headerData = (b as EditorJsHeaderBlock).data;
        const level = Math.min(6, Math.max(1, Number(headerData?.level) || 2));
        const html = String(headerData?.text || "");
        
        // H3 starts a new section
        if (level === 3) {
          flushCurrentSection();
          // Strip HTML tags for the title, but keep the HTML for rendering
          currentTitle = html.replace(/<[^>]*>/g, "");
        } else if (level === 1) {
          // H1 is the main title, skip it as it's already in the page heading
          return;
        } else {
          // Other headers become content
          if (level === 2) {
            currentContent.push(<h2 key={key} dangerouslySetInnerHTML={{ __html: html }} />);
          } else if (level === 4) {
            currentContent.push(<h4 key={key} dangerouslySetInnerHTML={{ __html: html }} />);
          } else if (level === 5) {
            currentContent.push(<h5 key={key} dangerouslySetInnerHTML={{ __html: html }} />);
          } else {
            currentContent.push(<h6 key={key} dangerouslySetInnerHTML={{ __html: html }} />);
          }
        }
      } else if (b.type === "paragraph") {
        const paragraphData = (b as EditorJsParagraphBlock).data;
        const html = String(paragraphData?.text || "");
        currentContent.push(<p key={key} dangerouslySetInnerHTML={{ __html: html }} />);
      } else if (b.type === "list") {
        const listData = (b as EditorJsListBlock).data || {};
        const style = listData.style === "ordered" ? "ol" : "ul";
        const items: string[] = Array.isArray(listData.items) ? listData.items : [];
        if (style === "ol") {
          currentContent.push(
            <ol key={key} className="list-inside list-decimal">
              {items.map((it, i) => (
                <li key={i} dangerouslySetInnerHTML={{ __html: String(it) }} />
              ))}
            </ol>
          );
        } else {
          currentContent.push(
            <ul key={key} className="list-inside list-disc">
              {items.map((it, i) => (
                <li key={i} dangerouslySetInnerHTML={{ __html: String(it) }} />
              ))}
            </ul>
          );
        }
      } else if (b.type === "quote") {
        const quoteData = (b as EditorJsQuoteBlock).data || {};
        const text = String(quoteData.text || "");
        const caption = String(quoteData.caption || "");
        const alignment = quoteData.alignment || "left";
        currentContent.push(
          <blockquote 
            key={key} 
            className={`border-l-4 border-gray-300 pl-4 py-2 ${alignment === "center" ? "text-center" : ""} italic text-gray-700`}
          >
            <div dangerouslySetInnerHTML={{ __html: text }} />
            {caption ? (
              <cite
                className="block mt-2 text-sm text-gray-500 not-italic"
                dangerouslySetInnerHTML={{ __html: caption }}
              />
            ) : null}
          </blockquote>
        );
      } else if (b.type === "linkTool") {
        const linkData = (b as EditorJsLinkBlock).data || {};
        const link = linkData.link || "";
        const title = linkData.meta?.title || link;
        const description = linkData.meta?.description || "";
        const image = linkData.meta?.image?.url || "";
        currentContent.push(
          <div key={key} className="border-2 border-blue-200 bg-blue-50 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-100 transition-all duration-200">
            <a href={link} target="_blank" rel="noopener noreferrer" className="block group">
              <div className="flex gap-4">
                {image && (
                  <img 
                    src={image} 
                    alt={title} 
                    className="w-16 h-16 object-cover rounded flex-shrink-0 border border-blue-200"
                  />
                )}
                <div className="flex-1">
                  <h4 className="font-bold text-blue-700 group-hover:text-blue-900 line-clamp-2 text-lg">{title}</h4>
                  {description && (
                    <p className="text-sm text-gray-700 mt-1 line-clamp-2 font-medium">{description}</p>
                  )}
                  <div className="flex items-center mt-2">
                    <svg className="w-4 h-4 text-blue-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    <p className="text-xs text-blue-600 font-medium">{new URL(link).hostname}</p>
                  </div>
                </div>
              </div>
            </a>
          </div>
        );
      } else if (b.type === "image") {
        const imageData = (b as EditorJsImageBlock).data || {};
        const url = imageData.file?.url || "";
        const caption = imageData.caption || "";
        const withBorder = imageData.withBorder;
        const withBackground = imageData.withBackground;
        const stretched = imageData.stretched;
        if (url) {
          currentContent.push(
            <figure key={key} className={`${stretched ? "w-full" : "max-w-2xl mx-auto"}`}>
              <img
                src={url}
                alt={caption || "Image"}
                className={`w-full h-auto rounded-lg ${withBorder ? "border border-gray-200" : ""} ${withBackground ? "bg-gray-50 p-4" : ""}`}
              />
              {caption && (
                <figcaption className="text-sm text-gray-600 text-center mt-2 italic">
                  {caption}
                </figcaption>
              )}
            </figure>
          );
        }
      } else if (b.type === "delimiter") {
        currentContent.push(
          <div key={key} className="flex justify-center py-6">
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
            </div>
          </div>
        );
      } else if (b.type === "table") {
        const tableData = (b as EditorJsTableBlock).data || {};
        const withHeadings = tableData.withHeadings || false;
        const content = tableData.content || [];
        if (content.length > 0) {
          currentContent.push(
            <div key={key} className="overflow-x-auto">
              <table className="min-w-full border-collapse border border-gray-200">
                {withHeadings && content[0] && (
                  <thead>
                    <tr className="bg-gray-50">
                      {content[0].map((cell, cellIdx) => (
                        <th 
                          key={cellIdx} 
                          className="border border-gray-200 px-4 py-2 text-left font-semibold text-gray-900"
                        >
                          {cell}
                        </th>
                      ))}
                    </tr>
                  </thead>
                )}
                <tbody>
                  {content.slice(withHeadings ? 1 : 0).map((row, rowIdx) => (
                    <tr key={rowIdx} className={rowIdx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      {row.map((cell, cellIdx) => (
                        <td 
                          key={cellIdx} 
                          className="border border-gray-200 px-4 py-2 text-gray-700"
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
      } else if (b.type === "code") {
        const codeData = (b as EditorJsCodeBlock).data || {};
        const code = codeData.code || "";
        currentContent.push(
          <pre key={key} className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
            <code className="text-sm">{code}</code>
          </pre>
        );
      }
    });

    // Flush the last section
    flushCurrentSection();

    return sections;
  } catch {
    return null;
  }
}