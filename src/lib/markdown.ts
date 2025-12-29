import { createMarkdownProcessor, type MarkdownProcessor } from '@astrojs/markdown-remark';
import { escapeHTML, markHTMLString } from 'astro/runtime/server/index.js';

let processorPromise: Promise<MarkdownProcessor> | null = null;

const getProcessor = () => {
  if (!processorPromise) {
    processorPromise = createMarkdownProcessor();
  }
  return processorPromise;
};

export const renderMarkdown = async (content: string) => {
  try {
    const processor = await getProcessor();
    const { code } = await processor.render(content);
    return markHTMLString(code);
  } catch (error) {
    console.error('Failed to render markdown content.', error);
    return markHTMLString(escapeHTML(content));
  }
};
