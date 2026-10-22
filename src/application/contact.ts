/**
 * How people using the pilot reach its administrator. The values come from the deployment (build variables), never
 * from the public source code; each one is shown only when it is well formed.
 */
export interface PilotContact {
  readonly email?: string;
  /** WhatsApp username, without the leading @. */
  readonly whatsapp?: string;
  /** GitHub account name. */
  readonly github?: string;
}

export interface PilotContactInput {
  readonly email?: string;
  readonly whatsapp?: string;
  readonly github?: string;
}

const EMAIL = /^[^\s@<>"]+@[^\s@<>"]+\.[A-Za-z]{2,}$/;
const WHATSAPP = /^[A-Za-z0-9._]{3,35}$/;
const GITHUB = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;

const valid = (value: string | undefined, pattern: RegExp) => {
  const trimmed = value?.trim();
  return trimmed && pattern.test(trimmed) ? trimmed : undefined;
};

export function pilotContact(input: PilotContactInput): PilotContact {
  const email = valid(input.email, EMAIL);
  const whatsapp = valid(input.whatsapp?.trim().replace(/^@/, ''), WHATSAPP);
  const github = valid(input.github, GITHUB);
  return { ...(email && { email }), ...(whatsapp && { whatsapp }), ...(github && { github }) };
}

export const hasContact = (contact: PilotContact) => Boolean(contact.email || contact.whatsapp || contact.github);
