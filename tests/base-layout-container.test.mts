import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getViteConfig } from "astro/config";
import { load } from "cheerio";
import { createServer, type ViteDevServer } from "vite";

describe("BaseLayout rendered chrome contract (USMR 14.10)", () => {
  let server: ViteDevServer | undefined;
  let renderLayout: (chrome?: boolean) => Promise<string>;

  beforeAll(async () => {
    // This suite owns its Astro transforms; the shared Vitest config also
    // serves Node-only tests and must keep its runner discovery unchanged.
    const config = await getViteConfig({
      cacheDir: ".build/cache/vite-container-test",
      server: { middlewareMode: true, hmr: false, ws: false, watch: null },
      optimizeDeps: { noDiscovery: true, include: [] },
      // Exercise the production layout, excluding the dev-only Tweaks island.
      define: {
        "import.meta.env.DEV": "false",
        "import.meta.env.PROD": "true",
      },
    })({ command: "serve", mode: "test" });
    server = await createServer({ ...config, configFile: false });
    const { default: BaseLayout } = await server.ssrLoadModule(
      "/src/layouts/BaseLayout.astro",
    );
    const { experimental_AstroContainer: AstroContainer } =
      await server.ssrLoadModule("astro/container");
    const container = await AstroContainer.create();
    renderLayout = (chrome) =>
      container.renderToString(BaseLayout, {
        partial: false,
        props: {
          title: "Chrome contract",
          ...(chrome === undefined ? {} : { chrome }),
        },
        slots: { default: '<h1 id="layout-content">Rendered main content</h1>' },
      });
  }, 30_000);

  afterAll(async () => {
    await server?.close();
  });

  it("omits navigation and footer when chrome is false, retaining one main", async () => {
    const $ = load(await renderLayout(false));
    expect($(".site-nav")).toHaveLength(0);
    expect($(".site-footer")).toHaveLength(0);
    expect($("main#main-content")).toHaveLength(1);
    expect($("main#main-content > #layout-content").text()).toBe(
      "Rendered main content",
    );
  });

  it("renders navigation, footer, and main exactly once by default", async () => {
    const $ = load(await renderLayout());
    expect($(".site-nav")).toHaveLength(1);
    expect($(".site-footer")).toHaveLength(1);
    expect($("main#main-content")).toHaveLength(1);
    expect($("main#main-content > #layout-content").text()).toBe(
      "Rendered main content",
    );
  });
});
