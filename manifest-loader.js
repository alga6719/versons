const existingManifest = window.__TOKEN_MANIFEST__;

const manifestImportPromise = existingManifest
  ? Promise.resolve(existingManifest)
  : import("./token-manifest.json", {
      assert: { type: "json" }
    }).then((module) => module.default ?? module);

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
