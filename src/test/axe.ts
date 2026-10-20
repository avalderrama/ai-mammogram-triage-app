import axe from 'axe-core';
import { expect } from 'vitest';

/** Fails on critical or serious axe violations (UX-ACC-018). Contrast is checked in the browser, not jsdom. */
export async function expectNoSeriousA11yViolations(root: Element = document.body): Promise<void> {
  const results = await axe.run(root, { rules: { 'color-contrast': { enabled: false } } });
  const serious = results.violations
    .filter((v) => v.impact === 'critical' || v.impact === 'serious')
    .map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`);
  expect(serious).toEqual([]);
}
