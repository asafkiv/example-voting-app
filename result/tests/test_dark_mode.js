/**
 * Tests for dark mode theme support in the result app.
 * These tests verify the HTML and CSS assets contain the required
 * dark mode elements without needing a running server.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const viewsDir = path.join(__dirname, '..', 'views');
const htmlPath = path.join(viewsDir, 'index.html');
const cssPath  = path.join(viewsDir, 'stylesheets', 'style.css');

const html = fs.readFileSync(htmlPath, 'utf8');
const css  = fs.readFileSync(cssPath, 'utf8');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log('  ✓ ' + name);
    passed++;
  } catch (e) {
    console.log('  ✗ ' + name);
    console.log('    ' + e.message);
    failed++;
  }
}

console.log('\nDark Mode – result app\n');

test('index.html contains theme-toggle button', function() {
  assert(html.includes('id="theme-toggle"'), 'Missing #theme-toggle element');
});

test('index.html contains dark class toggle script', function() {
  assert(html.includes('body.classList'), 'Missing classList toggle logic');
  assert(html.includes('localStorage'), 'Missing localStorage usage');
});

test('index.html respects prefers-color-scheme', function() {
  assert(html.includes('prefers-color-scheme'), 'Missing prefers-color-scheme media query');
});

test('index.html toggle aria-label present', function() {
  assert(html.includes('aria-label'), 'Missing aria-label on toggle');
});

test('CSS defines CSS custom properties for theming', function() {
  assert(css.includes(':root'), 'Missing :root block');
  assert(css.includes('--result-panel-bg'), 'Missing --result-panel-bg variable');
  assert(css.includes('--divider-color'), 'Missing --divider-color variable');
});

test('CSS defines body.dark overrides', function() {
  assert(css.includes('body.dark'), 'Missing body.dark rule');
});

test('CSS includes #theme-toggle styles', function() {
  assert(css.includes('#theme-toggle'), 'Missing #theme-toggle CSS');
});

test('CSS background-stats colors are present for dark mode', function() {
  assert(css.includes('body.dark #background-stats-1'), 'Missing dark mode background-stats-1');
  assert(css.includes('body.dark #background-stats-2'), 'Missing dark mode background-stats-2');
});

console.log('\n' + passed + ' passing, ' + failed + ' failing\n');
process.exit(failed > 0 ? 1 : 0);
