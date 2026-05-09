import {
  createMarkdownProcessor,
  type MarkdownProcessor,
} from "@astrojs/markdown-remark";
import { escapeHTML, markHTMLString } from "astro/runtime/server/index.js";

// pt430 — module-level memoization of the markdown processor. This is
// the only mutable module-level state in `src/lib/`; the build calls
// `renderMarkdown` thousands of times during MDX/FAQ rendering and
// `createMarkdownProcessor()` cost dominates if re-instantiated per
// call. The Promise is captured (not the resolved processor) so
// concurrent first calls share the same in-flight init. There is no
// reset path — by design: tests should construct their own processor
// rather than reach into this module's state.
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
    console.error("Failed to render markdown content.", error);
    return markHTMLString(escapeHTML(content));
  }
};
