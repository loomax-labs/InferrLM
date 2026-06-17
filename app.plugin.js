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

function injectSpmRootFix(contents) {
  const block = [
    'if defined?(::SPMManager) && ::SPMManager.instance_methods.include?(:add_spm_to_target)',
    '  ::SPMManager.class_eval do',
    '    unless method_defined?(:inferrlm_add_spm_to_target)',
    '      alias_method :inferrlm_add_spm_to_target, :add_spm_to_target',
    '',
    '      def add_spm_to_target(project, target, url, requirement, products)',
    '        root = project.root_object',
    '        if root && project.objects_by_uuid[root.uuid] != root',
    '          root.add_referrer(project)',
    '        end',
    '',
    '        inferrlm_add_spm_to_target(project, target, url, requirement, products)',
    '      end',
    '    end',
    '  end',
    'end',
  ].join('\n');

  if (contents.includes('::SPMManager.class_eval do')) {
    return contents;
  }

  const anchor = 'prepare_react_native_project!';

  if (!contents.includes(anchor)) {
    return contents;
  }

  return contents.replace(anchor, `${block}\n\n${anchor}`);
}

function injectModularHeadersPostInstall(contents) {
  const code = [
    '',
    "    installer.pods_project.targets.each do |target|",
    "      if ['GoogleUtilities', 'RecaptchaInterop'].include?(target.name)",
    '        target.build_configurations.each do |config|',
    "          config.build_settings['DEFINES_MODULE'] = 'YES'",
    '        end',
    '      end',
    '    end',
  ].join('\n');

  const anchor = ':ccache_enabled => ccache_enabled?(podfile_properties),';

  if (!contents.includes(anchor) || contents.includes("'DEFINES_MODULE'")) {
    return contents;
  }

  return contents.replace(
    `${anchor}\n    )\n  end`,
    `${anchor}\n    )${code}\n  end`,
  );
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

    delete buildSettings.LIBRARY_SEARCH_PATHS;
  }

  return project;
}

function withIos(config) {
  config = withPodfile(config, (modConfig) => {
    modConfig.modResults.contents = disableDeterministicPodUuids(modConfig.modResults.contents);
    modConfig.modResults.contents = injectSpmRootFix(modConfig.modResults.contents);
    modConfig.modResults.contents = injectModularHeadersPostInstall(modConfig.modResults.contents);
    return modConfig;
  });

  return withXcodeProject(config, (modConfig) => {
    stripProjectBuildSettings(modConfig.modResults);
    return modConfig;
  });
}

module.exports = withIos;
module.exports._helpers = {
  disableDeterministicPodUuids,
  injectSpmRootFix,
};