import React from "react";
import {
  EditorJsDoc,
  EditorJsBlock,
  EditorJsParagraphBlock,
  EditorJsHeaderBlock,
  EditorJsListBlock,
  EditorJsQuoteBlock,
  EditorJsLinkBlock,
  EditorJsImageBlock,
  EditorJsTableBlock,
  EditorJsCodeBlock,
} from "@/app/utils/editorJsUtils";

function EditorJsRenderer({ content }: { content?: string | null }) {
  if (!content) return null;
  try {
    const parsed = JSON.parse(content) as EditorJsDoc;
    const blocks = parsed.blocks || [];
    if (!blocks.length) return null;

    return (
      <div className="editorjs-content prose max-w-none prose-p:leading-relaxed prose-headings:font-semibold [&_a]:text-blue-600 [&_a]:underline [&_a]:font-medium [&_a:hover]:text-blue-800 [&_a:hover]:no-underline [&_a]:transition-colors [&_a]:duration-200">
        {blocks.map((b: EditorJsBlock, idx: number) => {
          const key = b.id || String(idx);
          switch (b.type) {
            case "paragraph": {
              const html = String((b.data as EditorJsParagraphBlock["data"])?.text || "");
              return (
                <p key={key} dangerouslySetInnerHTML={{ __html: html }} />
              );
            }
            case "header": {
              const level = Math.min(6, Math.max(1, Number((b as EditorJsHeaderBlock).data?.level) || 2));
              const html = String((b as EditorJsHeaderBlock).data?.text || "");
              if (level === 1)
                return <h1 key={key} dangerouslySetInnerHTML={{ __html: html }} />;
              if (level === 2)
                return <h2 key={key} dangerouslySetInnerHTML={{ __html: html }} />;
              if (level === 3)
                return <h3 key={key} dangerouslySetInnerHTML={{ __html: html }} />;
              if (level === 4)
                return <h4 key={key} dangerouslySetInnerHTML={{ __html: html }} />;
              if (level === 5)
                return <h5 key={key} dangerouslySetInnerHTML={{ __html: html }} />;
              return <h6 key={key} dangerouslySetInnerHTML={{ __html: html }} />;
            }
            case "list": {
              const data = (b as EditorJsListBlock).data || {};
              const style = data.style === "ordered" ? "ol" : "ul";
              const items: string[] = Array.isArray(data.items) ? data.items : [];
              if (style === "ol") {
                return (
                  <ol key={key} className="list-inside list-decimal">
                    {items.map((it, i) => (
                      <li key={i} dangerouslySetInnerHTML={{ __html: String(it) }} />
                    ))}
                  </ol>
                );
              }
              return (
                <ul key={key} className="list-inside list-disc">
                  {items.map((it, i) => (
                    <li key={i} dangerouslySetInnerHTML={{ __html: String(it) }} />
                  ))}
                </ul>
              );
            }
            case "quote": {
              const data = (b as EditorJsQuoteBlock).data || {};
              const text = String(data.text || "");
              const caption = String(data.caption || "");
              const alignment = data.alignment || "left";
              return (
                <blockquote 
                  key={key} 
                  className={`border-l-4 border-gray-300 pl-4 py-2 ${alignment === "center" ? "text-center" : ""} italic text-gray-700`}
                >
                  <div dangerouslySetInnerHTML={{ __html: text }} />
                  {caption ? (
                    <cite className="block mt-2 text-sm text-gray-500 not-italic" dangerouslySetInnerHTML={{ __html: caption }} />
                  ) : null}
                </blockquote>
              );
            }
            case "linkTool": {
              const data = (b as EditorJsLinkBlock).data || {};
              const link = data.link || "";
              const title = data.meta?.title || link;
              const description = data.meta?.description || "";
              const image = data.meta?.image?.url || "";
              return (
                <div key={key} className="border-2 border-blue-200 bg-blue-50 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-100 transition-all duration-200 not-prose">
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
            }
            case "image": {
              const data = (b as EditorJsImageBlock).data || {};
              const url = data.file?.url || "";
              const caption = data.caption || "";
              const withBorder = data.withBorder;
              const withBackground = data.withBackground;
              const stretched = data.stretched;
              if (!url) return null;
              return (
                <figure key={key} className={`not-prose ${stretched ? "w-full" : "max-w-2xl mx-auto"}`}>
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
            case "delimiter": {
              return (
                <div key={key} className="flex justify-center py-6 not-prose">
                  <div className="flex space-x-1">
                    <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                    <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                    <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                  </div>
                </div>
              );
            }
            case "table": {
              const data = (b as EditorJsTableBlock).data || {};
              const withHeadings = data.withHeadings || false;
              const content = data.content || [];
              if (content.length === 0) return null;
              return (
                <div key={key} className="overflow-x-auto not-prose">
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
            case "code": {
              const data = (b as EditorJsCodeBlock).data || {};
              const code = data.code || "";
              return (
                <pre key={key} className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto not-prose">
                  <code className="text-sm">{code}</code>
                </pre>
              );
            }
            default: {
              return null;
            }
          }
        })}
      </div>
    );
  } catch {
    return (
      <div className="prose max-w-none">
        <p dangerouslySetInnerHTML={{ __html: content }} />
      </div>
    );
  }
}

export default EditorJsRenderer;