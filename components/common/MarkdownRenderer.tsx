/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { marked } from 'marked';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
  const getMarkdownText = () => {
    return { __html: marked.parse(content || '') as string };
  };

  return (
    <div
      className={`markdown-body ${className} prose prose-invert max-w-none 
                  prose-h1:text-xl prose-h2:text-lg prose-h3:text-base 
                  prose-p:text-sm prose-li:text-sm prose-a:text-blue-400 hover:prose-a:text-blue-300
                  prose-code:bg-gray-700 prose-code:text-gray-200 prose-code:px-1 prose-code:rounded`}
      dangerouslySetInnerHTML={getMarkdownText()}
    />
  );
};

export default MarkdownRenderer;