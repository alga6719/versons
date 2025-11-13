const existingManifest = window.__TOKEN_MANIFEST__;

const protocol = window?.location?.protocol ?? "";
const origin = window?.location?.origin ?? "";
const isFileLikeContext = protocol === "file:" || origin === "null";

let manifestImportPromise;

if (existingManifest) {
  manifestImportPromise = Promise.resolve(existingManifest);
} else if (isFileLikeContext) {
  console.info(
    "Skipping token-manifest.json preload import in file:// context; relying on inline data."
  );
  manifestImportPromise = Promise.resolve(null);
} else {
  manifestImportPromise = import("./token-manifest.json", {
    assert: { type: "json" }
  }).then((module) => module.default ?? module);
}

window.__TOKEN_MANIFEST_PROMISE__ = manifestImportPromise
  .then((manifest) => {
    if (manifest && typeof manifest === "object") {
      window.__TOKEN_MANIFEST__ = manifest;
    }
    return manifest;
  })
  .catch((error) => {
    console.warn("Unable to preload token-manifest.json via module import.", error);
    throw error;
  });
