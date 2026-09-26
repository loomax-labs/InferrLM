const { withProjectBuildGradle, createRunOncePlugin } = require('@expo/config-plugins');
const { ensureJitPack } = require('./jitpack');

function withRootAccess(config) {
  return withProjectBuildGradle(config, mod => {
    mod.modResults.contents = ensureJitPack(mod.modResults.contents);
    return mod;
  });
}

const plugin = createRunOncePlugin(withRootAccess, 'root-access', '1.0.0');
module.exports = plugin;
module.exports.ensureJitPack = ensureJitPack;
