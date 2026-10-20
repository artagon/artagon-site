import rss from "@astrojs/rss";
import { getPublishedPosts } from "../../lib/writing";
import type { APIContext } from "astro";

export async function GET(context: APIContext) {
  const posts = await getPublishedPosts();

  return rss({
    title: "Artagon — Writing",
    description:
      "Field notes, technical write-ups, and announcements from the team building the Artagon identity platform.",
    site: context.site ?? "https://artagon.com",
    items: posts
      .map((post) => ({
        title: post.data.title,
        description: post.data.description,
        link: `/writing/${post.id}`,
        pubDate: post.data.published,
      })),
    customData: `<language>en-us</language>`,
  });
}
