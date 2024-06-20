/* eslint-disable */
const {build, context} = require("esbuild");
const {copy} = require("esbuild-plugin-copy");
const sassPlugin = require("esbuild-sass-plugin").sassPlugin;
const autoprefixer = require("autoprefixer");
const postcss = require("postcss");
const PocketBase = require("pocketbase/cjs");
const fs = require("fs");
const path = require("path");

//@ts-check
/** @typedef {import('esbuild').BuildOptions} BuildOptions **/

/** @type BuildOptions */
const baseConfig = {
   bundle: true,
   minify: process.env.NODE_ENV === "production" || process.env.NODE_ENV === "publish",
   sourcemap: process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "publish",
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
            const {css} = await postcss([autoprefixer]).process(source, {from: undefined});
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

// Function to update the version field in PocketBase
async function updateVersionInPocketBase(newVersion) {
   const pb = new PocketBase("https://solwind.up.railway.app");

   try {
      // Authenticate as admin
      await pb.admins.authWithPassword("admin@admin.com", "zqzksryxiwahwcr");

      // Fetch the current version
      const record = await pb.collection("version").getOne("yr0aiacmjhc5jz0");

      // Update the collection with the new version
      const data = {version: newVersion};
      await pb.collection("version").update("yr0aiacmjhc5jz0", data);
      console.log("PocketBase version updated successfully");
   } catch (error) {
      console.error("Error updating PocketBase version:", error);
   }
}

// Function to update the version in package.json
function updatePackageJsonVersion(newVersion) {
   const packageJsonPath = path.resolve(__dirname, "package.json");
   const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

   packageJson.version = newVersion;

   fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), "utf8");
   console.log("package.json version updated to:", newVersion);
}

// Function to increment version by 0.0.1
function incrementVersion(version) {
   const parts = version.split(".").map(Number);
   parts[2] += 1;
   if (parts[2] >= 10) {
      parts[2] = 0;
      parts[1] += 1;
      if (parts[1] >= 10) {
         parts[1] = 0;
         parts[0] += 1;
      }
   }
   return parts.join(".");
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

         if (process.env.NODE_ENV === "publish") {
            const packageJsonPath = path.resolve(__dirname, "package.json");
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
            const currentVersion = packageJson.version;
            console.log("Current package.json version:", currentVersion);
            const newVersion = incrementVersion(currentVersion);
            console.log("New version to set:", newVersion);

            await updateVersionInPocketBase(newVersion);
            updatePackageJsonVersion(newVersion);
         }
      }
   } catch (err) {
      console.error("Build script error:", err);
      process.exit(1);
   }
})();
