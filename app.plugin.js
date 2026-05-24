const { withXcodeProject } = require('@expo/config-plugins');

function stripProjectBuildSettings(project) {
  const section = project.pbxXCBuildConfigurationSection();

  for (const key of Object.keys(section)) {
    if (key.endsWith('_comment')) {
      continue;
    }

    const config = section[key];
    const buildSettings = config?.buildSettings;

    if (!buildSettings || buildSettings.PRODUCT_NAME) {
      continue;
    }

    delete buildSettings.SDKROOT;
    delete buildSettings.LIBRARY_SEARCH_PATHS;
  }

  return project;
}

function withIos(config) {
  return withXcodeProject(config, (modConfig) => {
    stripProjectBuildSettings(modConfig.modResults);
    return modConfig;
  });
}

module.exports = withIos;