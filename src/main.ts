/**
 * ✨ Cognitive Hypermedia Framework - Main Entry Point
 * 
 * This is the main entry point for the framework when used directly.
 * For using it as a library, import from the mod.ts file.
 */

// Re-export all framework components
export * from "../mod.ts";

// If this file is run directly, print usage instructions
if (import.meta.main) {
  console.log("🚀 Cognitive Hypermedia Framework");
  console.log("This is a library. To use it in your project, import from the mod.ts file.");
  console.log("");
  console.log("To see an example, run:");
  console.log("deno run --allow-net --allow-read --allow-write --unstable-kv examples/todo/app.ts");
}