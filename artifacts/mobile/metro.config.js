const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const WORKSPACE_ROOT = path.resolve(__dirname, "../..");

const config = getDefaultConfig(__dirname);

// pnpm monorepo: Metro must watch the workspace root so it can follow
// symlinks into the .pnpm store and correctly resolve + serve assets
// (including TTF font files in node_modules/@expo/vector-icons).
config.watchFolders = [WORKSPACE_ROOT];

// Ensure Metro looks for modules in both the project and workspace root
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, "node_modules"),
  path.resolve(WORKSPACE_ROOT, "node_modules"),
];

const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === "web" && moduleName === "react-native-maps") {
    return {
      filePath: path.resolve(__dirname, "stubs/react-native-maps.web.js"),
      type: "sourceFile",
    };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
