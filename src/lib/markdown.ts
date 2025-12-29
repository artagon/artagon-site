import { createMarkdownProcessor } from '@astrojs/markdown-remark';

const processorPromise = createMarkdownProcessor();

export const renderMarkdown = async (content: string) => {
  const processor = await processorPromise;
  return processor.render(content);
};
