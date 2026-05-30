import { Glob, $ } from "bun";
import { unlink } from "node:fs/promises";

// 1. Scan for files inside app/src
const glob = new Glob("app/src/{domain}/**/*.{ts,tsx}");
let virtualIndexContent = "";
let referenceDirectives = "";

for (const file of glob.scanSync(".")) {
    if (file.endsWith(".test.ts") || file.endsWith(".test.tsx") || file.includes("temp-entry")) {
        continue;
    }

    const cleanPath = "./" + file.replace("app/src/", "");

    if (file.endsWith(".d.ts")) {
        referenceDirectives += `/// <reference path="${cleanPath}" />\n`;
    } else {
        const modulePath = cleanPath.replace(/\.tsx?$/, "");
        virtualIndexContent += `export * from "${modulePath}";\n`;
    }
}

const finalContent = referenceDirectives + virtualIndexContent;

// 2. Write the temporary entry point
const tempEntry = "app/src/temp-entry.ts";
await Bun.write(tempEntry, finalContent);

// 3. Create an isolated, temporary tsconfig to block Vitest from leaking in
const tempConfig = "tsconfig.temp.json";
const isolatedConfig = {
    extends: "./tsconfig.json", // Inherit your base project rules
    compilerOptions: {
        types: [],                // 👈 CRITICAL: Blocks automatic scanning of node_modules globals (Vitest, Jest, etc.)
        skipLibCheck: true,       // Force bypass declaration file errors
    },
    include: [tempEntry]        // Strictly focus only on our spec list
};
await Bun.write(tempConfig, JSON.stringify(isolatedConfig, null, 2));

console.log("Generating unified spec sheet...");

try {
    // We use --project to isolate the input, AND --no-check to skip the output verification
    await $`bunx dts-bundle-generator --project ${tempConfig} --no-check -o dist/spec.d.ts ${tempEntry}`;
    console.log("✅ Done! Spec generated at dist/spec.d.ts");
} catch (error) {
    console.error("❌ Bundler failed. Check the errors above.");
} finally {
    // Always clean up both temporary files
    await unlink(tempEntry);
    await unlink(tempConfig);
}