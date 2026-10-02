const { getDefaultConfig } = require('expo/metro-config')

// Expo SDK 52+ detects the pnpm workspace and configures watchFolders and
// node_modules resolution for the monorepo on its own — overriding them here
// (notably `disableHierarchicalLookup`) breaks resolution of nested deps.
module.exports = getDefaultConfig(__dirname)
