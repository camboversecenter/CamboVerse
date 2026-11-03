// @vitest-environment jsdom
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {afterEach, expect, it} from 'vitest';

afterEach(() => {document.head.replaceChildren(); document.body.replaceChildren();});

it('keeps Anatomy entry controls above the full-screen touch walking layer', () => {
  const style = document.createElement('style');
  style.textContent = readFileSync(resolve('src/index.css'), 'utf8') + '\n' +
    readFileSync(resolve('src/components/BiologyRoom.css'), 'utf8');
  document.head.append(style);
  document.body.innerHTML = '<div class="bio-room"><div class="walk-layer"></div><div class="bio-top"><div class="bio-top-right"><button>Enter VR</button></div></div></div>';
  const layer = getComputedStyle(document.querySelector('.walk-layer')!);
  const top = getComputedStyle(document.querySelector('.bio-top')!);
  const controls = getComputedStyle(document.querySelector('.bio-top-right')!);
  expect(Number(top.zIndex)).toBeGreaterThan(Number(layer.zIndex));
  expect(top.pointerEvents).toBe('none'); // empty header space still permits looking
  expect(controls.pointerEvents).toBe('auto');
});
