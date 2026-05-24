const { withPodfile, withXcodeProject } = require('@expo/config-plugins');

function disableDeterministicPodUuids(contents) {
  const line = "install! 'cocoapods', :deterministic_uuids => false";

  if (contents.includes(line)) {
    return contents;
  }

  const anchor = 'prepare_react_native_project!';

  if (!contents.includes(anchor)) {
    return contents;
  }

  return contents.replace(anchor, `${line}\n\n${anchor}`);
}

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
  config = withPodfile(config, (modConfig) => {
    modConfig.modResults.contents = disableDeterministicPodUuids(modConfig.modResults.contents);
    return modConfig;
  });

  return withXcodeProject(config, (modConfig) => {
    stripProjectBuildSettings(modConfig.modResults);
    return modConfig;
  });
}

module.exports = withIos;