// Metro configuration: lets the app import the website's game logic from ../shared.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const sharedRoot = path.resolve(projectRoot, '../shared');
const config = getDefaultConfig(projectRoot);

config.watchFolders = [sharedRoot];
// Shared files only use Node built-ins and each other; resolve packages from the app.
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, 'node_modules')];

// shared/ is written for Node ESM, so it imports './game.js' while the file is
// './game.ts'. Retry those imports without the extension.
const defaultResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolve = defaultResolve ?? context.resolveRequest;
  if (context.originModulePath.startsWith(sharedRoot + path.sep) && moduleName.startsWith('.') && moduleName.endsWith('.js')) {
    try {
      return resolve(context, moduleName.slice(0, -3), platform);
    } catch {}
  }
  return resolve(context, moduleName, platform);
};

module.exports = config;
