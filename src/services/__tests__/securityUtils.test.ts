import { sanitizeInput } from '../SecurityUtils';
import { decodeHtmlEntities, stripHtmlTags } from '../search/SearchProvider';
import { sanitizeSkillHtml } from '../WebViewManager';

describe('sanitizeInput', () => {
  it('strips nested javascript protocol prefixes', () => {
    expect(sanitizeInput('javasjavascript:cript:alert(1)')).not.toMatch(/javascript:/i);
  });

  it('strips overlapping event-handler attributes', () => {
    expect(sanitizeInput('<<onclick=alert(1)')).not.toMatch(/onclick=/i);
  });
});

describe('search html cleanup', () => {
  it('does not double-unescape ampersand entities', () => {
    expect(decodeHtmlEntities('&amp;lt;script&amp;gt;')).toBe('&lt;script&gt;');
  });

  it('strips nested leftover tags', () => {
    const stripped = stripHtmlTags('<scr<script>ipt>hi</script>');
    expect(stripped).not.toMatch(/[<>]/);
    expect(stripHtmlTags('<b>hi</b>')).toBe('hi');
  });
});

describe('sanitizeSkillHtml', () => {
  it('removes nested iframe markup', () => {
    const html = '<p>ok</p><iframe<iframe src="https://evil.test"></iframe>';
    const sanitized = sanitizeSkillHtml(html);
    expect(sanitized).toContain('<p>ok</p>');
    expect(sanitized.toLowerCase()).not.toContain('iframe');
  });
});

describe('root-access jitpack', () => {
  const { ensureJitPack } = require('../../../modules/root-access/plugin/jitpack');

  it('rejects hostname substring lookalikes', () => {
    const gradle = "allprojects { repositories { maven { url 'https://evil.test/jitpack.io' } } }";
    expect(ensureJitPack(gradle)).toContain("url 'https://jitpack.io'");
  });

  it('keeps an existing jitpack maven url', () => {
    const gradle = "allprojects { repositories { maven { url 'https://jitpack.io' } } }";
    expect(ensureJitPack(gradle)).toBe(gradle);
  });
});
