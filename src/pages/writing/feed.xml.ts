import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import type { APIContext } from "astro";

export async function GET(context: APIContext) {
  const posts = (await getCollection("writing")).filter((p) => !p.data.draft);

  return rss({
    title: "Artagon — Writing",
    description:
      "Field notes, technical write-ups, and announcements from the team building the Artagon identity platform.",
    site: context.site ?? "https://artagon.com",
    items: posts
      .sort((a, b) => b.data.published.getTime() - a.data.published.getTime())
      .map((post) => ({
        title: post.data.title,
        description: post.data.description,
        link: `/writing/${post.id}`,
        pubDate: post.data.published,
      })),
    customData: `<language>en-us</language>`,
  });
}
