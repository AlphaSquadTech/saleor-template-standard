"use client";

import { useEffect, useRef } from "react";

interface HtmlWidgetRendererProps {
  content: string;
}

export default function HtmlWidgetRenderer({ content }: HtmlWidgetRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !content) return;


    // Create an iframe to completely isolate the dynamic content
    const iframe = document.createElement('iframe');
    iframe.style.width = '100%';
    iframe.style.border = 'none';
    iframe.style.minHeight = '100vh';
    iframe.style.height = 'auto';
    
    // Clear the container and add the iframe
    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(iframe);
    
    // Write the content to the iframe
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
          </head>
          <body style="margin: 0; padding: 0;">
            ${content}
          </body>
        </html>
      `);
      iframeDoc.close();
      
      // Auto-resize iframe to content
      iframe.onload = () => {
        const body = iframeDoc.body;
        const html = iframeDoc.documentElement;
        const height = Math.max(
          body.scrollHeight,
          body.offsetHeight,
          html.clientHeight,
          html.scrollHeight,
          html.offsetHeight
        );
        iframe.style.height = height + 'px';
      };
    }




    // Debug image loading issues
    const images = containerRef.current.querySelectorAll('img');
    
    images.forEach((img, index) => {
      
      // Fix relative paths and ensure proper src attributes
      const originalSrc = img.getAttribute('src');
      if (originalSrc) {
        // Handle relative paths by making them absolute
        if (originalSrc.startsWith('./') || originalSrc.startsWith('../') || (!originalSrc.startsWith('http') && !originalSrc.startsWith('/'))) {
          const absoluteSrc = new URL(originalSrc, window.location.href).href;
          img.src = absoluteSrc;
        }
        
        // Ensure images have proper loading attributes
        if (!img.hasAttribute('loading')) {
          img.setAttribute('loading', 'lazy');
        }
        
        // Add crossorigin for external images if needed
        if (img.src.includes('http') && !img.src.includes(window.location.hostname)) {
          img.setAttribute('crossorigin', 'anonymous');
        }
        
      }
      
      // Add error handling to images
      img.addEventListener('error', (e) => {
        // Just log the error, don't modify the styling
        img.alt = img.alt || `Failed to load image: ${originalSrc}`;
      });
    });

    // Extract and execute script tags
    const scripts = containerRef.current.querySelectorAll('script');
    
    scripts.forEach((oldScript, index) => {
      const newScript = document.createElement('script');
      
      // Copy all attributes
      Array.from(oldScript.attributes).forEach((attr) => {
        newScript.setAttribute(attr.name, attr.value);
      });
      
      // Copy the script content
      newScript.textContent = oldScript.textContent;
      
      // Replace the old script with the new one
      if (oldScript.parentNode) {
        oldScript.parentNode.replaceChild(newScript, oldScript);
      }
    });

    // Cleanup function to remove event listeners when component unmounts
    return () => {
      if (!containerRef.current) return;
      
      // Remove any global event listeners that might have been added
      const calculatorElements = containerRef.current.querySelectorAll('[data-number], [data-operation], #equals, #clear, #delete, [data-decimal]');
      calculatorElements?.forEach((element) => {
        const newElement = element.cloneNode(true);
        element.parentNode?.replaceChild(newElement, element);
      });
      
      // Clear any image event listeners by cloning the container
      const currentContainer = containerRef.current;
      const newContainer = currentContainer.cloneNode(true) as HTMLDivElement;
      currentContainer.parentNode?.replaceChild(newContainer, currentContainer);
    };
  }, [content]);

  return (
    <div 
      ref={containerRef} 
      className="html-widget-renderer"
      style={{
        isolation: 'isolate',
        contain: 'layout style paint',
      }}
    />
  );
}