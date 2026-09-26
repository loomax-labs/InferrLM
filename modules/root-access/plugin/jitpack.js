const JITPACK_MAVEN = "        maven { url 'https://jitpack.io' }";

function quotedUrls(contents) {
  const urls = [];
  const re = /['"](https?:\/\/[^'"]+)['"]/g;
  let match;
  while ((match = re.exec(contents))) {
    urls.push(match[1]);
  }
  return urls;
}

function isJitPackMavenUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' && parsed.hostname === 'jitpack.io';
  } catch {
    return false;
  }
}

function ensureJitPack(contents) {
  if (quotedUrls(contents).some(isJitPackMavenUrl)) {
    return contents;
  }
  return contents.replace(
    /allprojects\s*\{\s*repositories\s*\{/,
    `allprojects {\n    repositories {\n${JITPACK_MAVEN}`,
  );
}

module.exports = { ensureJitPack, isJitPackMavenUrl };
