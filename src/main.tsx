/** Composition root: the only module that knows every ring and wires infrastructure into the use cases. */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createAnalyzeMammogram } from './application/analyzeMammogram';
import { createConnectionSettings } from './application/connection';
import { BrowserImagePreparer } from './infrastructure/browserImagePreparer';
import { BrowserSettingsRepository } from './infrastructure/browserSettingsRepository';
import { LazyTriageGateway } from './infrastructure/mcp/lazyTriageGateway';
import { registerServiceWorker } from './infrastructure/serviceWorker';
import { App } from './presentation/App';
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
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App services={services} />
  </StrictMode>,
);

if (import.meta.env.PROD) registerServiceWorker();
