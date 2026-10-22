/** Composition root: the only module that knows every ring and wires infrastructure into the use cases. */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createAnalyzeMammogram } from './application/analyzeMammogram';
import { createConnectionSettings } from './application/connection';
import { pilotContact } from './application/contact';
import { createProposeCrop } from './application/proposeCrop';
import { BrowserImagePreparer } from './infrastructure/browserImagePreparer';
import { BrowserSettingsRepository } from './infrastructure/browserSettingsRepository';
import { CanvasCropDetector } from './infrastructure/canvasCropDetector';
import { LazyTriageGateway } from './infrastructure/mcp/lazyTriageGateway';
import { registerServiceWorker } from './infrastructure/serviceWorker';
import { App } from './presentation/App';
import { I18nProvider } from './presentation/i18n/I18nProvider';
import './presentation/styles/tokens.css';
import './presentation/styles/app.css';

const MAX_IMAGE_BYTES = 10_000_000; // must match MAMMO_MAX_IMAGE_MB on the server
const newCorrelationId = () => crypto.randomUUID().slice(0, 8).toUpperCase();

const gateway = new LazyTriageGateway();
const settings = new BrowserSettingsRepository(import.meta.env.VITE_DEFAULT_SERVER_URL ?? 'http://127.0.0.1:8765/mcp');
const services = {
  analyze: createAnalyzeMammogram({
    gateway, preparer: new BrowserImagePreparer(), settings, maxImageBytes: MAX_IMAGE_BYTES, newCorrelationId,
  }),
  connection: createConnectionSettings(gateway, settings, newCorrelationId),
  proposeCrop: createProposeCrop(new CanvasCropDetector()),
};

// Set by the deployment, not kept in the public source code (deploy.yml).
const contact = pilotContact({
  email: import.meta.env.VITE_CONTACT_EMAIL,
  whatsapp: import.meta.env.VITE_CONTACT_WHATSAPP,
  github: import.meta.env.VITE_CONTACT_GITHUB,
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <App services={services} contact={contact} />
    </I18nProvider>
  </StrictMode>,
);

if (import.meta.env.PROD) registerServiceWorker();
