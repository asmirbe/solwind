/* eslint-disable */
const { build, context } = require("esbuild");
const { copy } = require("esbuild-plugin-copy");
const sassPlugin = require("esbuild-sass-plugin").sassPlugin;
const autoprefixer = require("autoprefixer");
const postcss = require("postcss");

//@ts-check
/** @typedef {import('esbuild').BuildOptions} BuildOptions **/

/** @type BuildOptions */
const baseConfig = {
  bundle: true,
  minify: process.env.NODE_ENV === "production",
  sourcemap: process.env.NODE_ENV !== "production",
};

// Config for extension source code (to be run in a Node-based context)
/** @type BuildOptions */
const extensionConfig = {
  ...baseConfig,
  platform: "node",
  mainFields: ["module", "main"],
  format: "cjs",
  entryPoints: ["./src/extension.ts"],
  outfile: "./out/extension.js",
  external: ["vscode"],
};

// Config for webview source code (to be run in a web-based context)
/** @type BuildOptions */
const webviewConfig = {
  ...baseConfig,
  target: "es2020",
  format: "esm",
  entryPoints: ["./src/webview/main.ts", "./src/webview/main.scss"],
  outdir: "./out",
  plugins: [
    sassPlugin({
      async transform(source) {
        const { css } = await postcss([autoprefixer]).process(source, { from: undefined });
        return css;
      },
    }),
    copy({
      resolveFrom: "cwd",
      assets: {
        from: ["./src/webview/*.css"],
        to: ["./out"],
      },
    }),
  ],
};

// Watch configuration for `context` API
async function watch(config) {
  const ctx = await context(config);
  await ctx.watch();
  console.log("[watch] build finished");
}

// Build script
(async () => {
  const args = process.argv.slice(2);
  try {
    if (args.includes("--watch")) {
      // Build and watch extension and webview code
      console.log("[watch] build started");
      await watch(extensionConfig);
      await watch(webviewConfig);
    } else {
      // Build extension and webview code
      await build(extensionConfig);
      await build(webviewConfig);
      console.log("build complete");
    }
  } catch (err) {
    process.stderr.write(err.message);
    process.exit(1);
  }
})();
