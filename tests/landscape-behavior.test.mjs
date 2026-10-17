import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

// Run the orientation decisions independently of browser device detection.
function render(file, { path, forced = true, mobile = true, portrait = true, alreadyShown = true }) {
  const effects = [];
  const timers = [];
  const decisions = [];
  const states = [portrait, mobile, false];
  const store = { isForcedLandscape: forced, setForcedLandscape: value => decisions.push(value) };
  const jsx = (type, props) => ({ type, props });
  const modules = {
    react: { useEffect: callback => effects.push(callback), useState: () => [states.shift(), () => {}] },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'next/navigation': { usePathname: () => path },
    '@/store/useStore': { useStore: selector => selector(store) },
    '../../store/useStore': { useStore: selector => selector(store) },
    '@/data/identity': { identityAssets: {} },
    '@/utils/assets': { getAssetUrl: value => value },
    'lucide-react': {},
  };
  const output = ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  vm.runInNewContext(output, {
    exports,
    require: name => {
      assert.ok(name in modules, `Unexpected dependency: ${name}`);
      return modules[name];
    },
    sessionStorage: { getItem: () => alreadyShown ? 'true' : null, setItem: () => {} },
    setTimeout: (callback, delay) => { timers.push({ callback, delay }); return timers.length; },
    clearTimeout: () => {},
  });
  const tree = exports.default({ children: 'content' });
  return { tree, effects, decisions, timers };
}

const wrapper = '../src/components/layout/ForcedLandscapeWrapper.tsx';
const prompt = '../src/components/layout/UseLandscape.tsx';

test('Avance de Obras keeps forced landscape on portrait phones', () => {
  const { effects, decisions } = render(prompt, { path: '/avance-de-obra' });
  effects[1]();
  assert.deepEqual(decisions, [true]);
  assert.match(render(wrapper, { path: '/avance-de-obra' }).tree.props.style.transform, /rotate\(90deg\)/);
});

test('Ubicación allows its video to rotate and its map to return upright', () => {
  const { effects, decisions } = render(prompt, { path: '/ubicacion' });
  effects[1]();
  assert.deepEqual(decisions, [], 'The global prompt must not overwrite the video/map decision');
  assert.match(render(wrapper, { path: '/ubicacion', forced: true }).tree.props.style.transform, /rotate\(90deg\)/);
  assert.equal(render(wrapper, { path: '/ubicacion', forced: false }).tree.props.style, undefined);
});

test('Normal landscape and administrative pages remain upright', () => {
  const { effects, decisions } = render(prompt, { path: '/avance-de-obra', portrait: false });
  effects[1]();
  assert.deepEqual(decisions, [false]);
  for (const path of ['/', '/login', '/dashboard/progress']) {
    assert.equal(render(wrapper, { path }).tree.props.style, undefined);
  }
});

test('First mobile visit shows the prompt and then forces landscape after three seconds', () => {
  const { tree, effects, decisions, timers } = render(prompt, {
    path: '/avance-de-obra', forced: false, alreadyShown: false,
  });
  assert.ok(tree, 'The orientation prompt is visible');
  effects[1]();
  assert.deepEqual(decisions, [false]);
  assert.equal(timers[0].delay, 3000);
  timers[0].callback();
  assert.deepEqual(decisions, [false, true]);
});
