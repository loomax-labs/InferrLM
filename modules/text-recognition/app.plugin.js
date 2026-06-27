const { withPodfile } = require('@expo/config-plugins');

function injectExcludedArchsFix(contents) {
  const scrubBlock = [
    '    Dir.glob(File.join(installer.sandbox.root, "Target Support Files", "**", "*.xcconfig")).each do |path|',
    '      text = File.read(path)',
    '      cleaned = text.gsub(/EXCLUDED_ARCHS\\[sdk=iphonesimulator\\*\\]\\s*=\\s*\\S+\\n?/, "")',
    '      cleaned = cleaned.gsub(/-framework\\s+"MLKit\\S+"\\s*/, "") if path =~ /Pods-InferrLM/',
    '      cleaned = cleaned.gsub(/-framework\\s+"GoogleMLKit\\S*"\\s*/, "") if path =~ /Pods-InferrLM/',
    '      cleaned = cleaned.gsub(/-framework\\s+"MLImage\\S*"\\s*/, "") if path =~ /Pods-InferrLM/',
    '      File.write(path, cleaned) if text != cleaned',
    '    end',
  ].join('\n');

  if (contents.includes('Target Support Files", "**", "*.xcconfig')) {
    return contents;
  }

  const anchor = 'react_native_post_install(';

  if (!contents.includes(anchor)) {
    return contents;
  }

  return contents.replace(
    /(react_native_post_install\([\s\S]*?\n    \))/,
    `$1\n${scrubBlock}`
  );
}

module.exports = function withTextRecognitionIosPods(config) {
  return withPodfile(config, (modConfig) => {
    modConfig.modResults.contents = injectExcludedArchsFix(modConfig.modResults.contents);
    return modConfig;
  });
};
