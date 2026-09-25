const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { pathToFileURL } = require('node:url');
const { JSDOM, VirtualConsole } = require('jsdom');

const root = path.resolve(__dirname, '..');
const conceptDirectory = path.join(root, 'docs', 'concepts');
const pages = fs.readdirSync(conceptDirectory)
  .filter((name) => name.endsWith('.html'))
  .sort();
const failures = [];

for (const page of pages) {
  const pagePath = path.join(conceptDirectory, page);
  const html = fs.readFileSync(pagePath, 'utf8');
  const parseErrors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (error) => parseErrors.push(error.message));

  const dom = new JSDOM(html, {
    url: pathToFileURL(pagePath).href,
    runScripts: 'outside-only',
    virtualConsole,
  });

  for (const script of dom.window.document.querySelectorAll('script:not([src])')) {
    try {
      new vm.Script(script.textContent, { filename: pagePath });
    } catch (error) {
      failures.push(`${page}: inline JavaScript syntax error: ${error.message}`);
    }
  }

  const references = [];
  for (const element of dom.window.document.querySelectorAll('[src]')) {
    references.push(element.getAttribute('src'));
  }
  for (const match of html.matchAll(/["']([^"']+\.(?:png|jpe?g|webp|gif|svg|ico)(?:[?#][^"']*)?)["']/gi)) {
    references.push(match[1]);
  }
  const cssSources = [
    ...[...dom.window.document.querySelectorAll('style')].map((style) => style.textContent),
    ...[...dom.window.document.querySelectorAll('[style]')].map((element) => element.getAttribute('style')),
  ];
  for (const css of cssSources) {
    for (const match of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) {
      references.push(match[1]);
    }
  }

  for (const reference of references) {
    if (!reference || /^(?:data:|https?:|\/\/|#)/i.test(reference)) continue;
    const cleanReference = reference.split(/[?#]/, 1)[0];
    const target = path.resolve(path.dirname(pagePath), cleanReference);
    if (!fs.existsSync(target)) {
      failures.push(`${page}: missing local asset ${reference}`);
    }
  }

  if (parseErrors.length > 0) {
    failures.push(...parseErrors.map((error) => `${page}: ${error}`));
  }

  console.log(`OK ${page}`);
  dom.window.close();
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Verified ${pages.length} concept pages.`);
}
