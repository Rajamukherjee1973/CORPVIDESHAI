import { describe, it, expect } from 'vitest';
import { THREATS } from '../lib/security';
import { breachFrame, BREACH_PLAYBOOKS } from '../lib/breach-playbook';
describe('breach simulation transitions', () => {
  for (const threat of THREATS) it(`${threat.id} contains only after its containment checkpoint`, () => {
    const contain = threat.steps.find(s => s.kind === 'contain');
    if (!contain) throw new Error('missing containment');
    expect(breachFrame(threat, contain.atMs - 1).blocked).toBe(false);
    expect(breachFrame(threat, contain.atMs).blocked).toBe(true);
    expect(breachFrame(threat, 4200).restored).toBe(true);
    expect(BREACH_PLAYBOOKS[threat.id]).toBeDefined();
  });
  it('idle is not labelled contained', () => { expect(breachFrame(null, 4200).blocked).toBe(false); });
});
