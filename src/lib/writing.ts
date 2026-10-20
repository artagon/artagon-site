import { getCollection } from "astro:content";
export { formatPostDate, postDateParts } from "./writing-format";

// USMR 14.12: one draft filter and publication order for home, index,
// details, and RSS. CollectionEntry inference remains intact.
export async function getPublishedPosts() {
  return (await getCollection("writing"))
    .filter((post) => !post.data.draft)
    .sort((a, b) => b.data.published.getTime() - a.data.published.getTime());
}

export async function getAuthorNames() {
  return new Map(
    (await getCollection("authors")).map((author) => [
      author.id,
      author.data.name,
    ]),
  );
}
