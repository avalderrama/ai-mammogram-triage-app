import { describe, expect, it } from 'vitest';
import { hasContact, pilotContact } from './contact';

describe('pilotContact', () => {
  it('keeps well-formed values and drops the @ of the WhatsApp username', () => {
    expect(pilotContact({ email: ' admin@example.org ', whatsapp: '@pilot.admin', github: 'pilot-admin' }))
      .toEqual({ email: 'admin@example.org', whatsapp: 'pilot.admin', github: 'pilot-admin' });
  });

  it('shows nothing when the deployment sets nothing (development, forks)', () => {
    const contact = pilotContact({});
    expect(contact).toEqual({});
    expect(hasContact(contact)).toBe(false);
  });

  it.each([
    ['email', { email: 'not an email' }],
    ['email with markup', { email: 'a@b.org"><script>' }],
    ['whatsapp', { whatsapp: '@a b' }],
    ['github', { github: '-starts-with-dash' }],
  ])('drops a malformed %s', (_name, input) => {
    expect(pilotContact(input)).toEqual({});
  });
});
