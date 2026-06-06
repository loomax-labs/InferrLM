const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');

const defaultConfig = getDefaultConfig(__dirname);

const litertLmRoot = path.resolve(__dirname, '../react-native-litert-lm');

defaultConfig.watchFolders = [litertLmRoot];

defaultConfig.resolver.extraNodeModules = new Proxy(
  { '@inferrlm/react-native-litert-lm': litertLmRoot },
  {
    get: (target, name) =>
      Object.prototype.hasOwnProperty.call(target, name)
        ? target[name]
        : path.join(__dirname, 'node_modules', String(name)),
  }
);

defaultConfig.resolver.assetExts.push(
  'woff',
  'woff2',
  'md',
  'html',
  'obj',
  'mtl',
  'JPG',
  'JPEG',
  'PNG',
  'GIF',
  'WEBP',
  'pdf'
);

defaultConfig.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

defaultConfig.resolver.sourceExts.push('cjs');
defaultConfig.resolver.unstable_enablePackageExports = false;

defaultConfig.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

defaultConfig.resolver.platforms = ['ios', 'android', 'native'];

module.exports = defaultConfig;