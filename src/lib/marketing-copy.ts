import type { CollectionEntry } from "astro:content";

// USMR 14.9: route copy is validated collection data, including its
// authored line breaks and *emphasis*; components own presentation only.
export type MarketingCopy = Pick<
  CollectionEntry<"pages">["data"],
  "eyebrow" | "headline" | "lede"
>;

export function headlineParts(headline: string) {
  return headline.split(/(\n|\*[^*]+\*)/g).map((value) => {
    if (value === "\n") return { kind: "break", value } as const;
    if (value.startsWith("*") && value.endsWith("*")) {
      return { kind: "emphasis", value: value.slice(1, -1) } as const;
    }
    return { kind: "text", value } as const;
  });
}
