import { useRef, useState } from 'react';
import type { ConnectionCheck, ConnectionSettingsUseCases } from '../../application/connection';
import { parseServerUrl } from '../../application/serverUrl';
import { Banner, FailurePanel } from '../components/Feedback';
import { Icon } from '../components/Icon';
import { useViewHeading } from '../hooks';

type Errors = Partial<Record<'serverUrl' | 'accessKey', string>>;

function validate(serverUrl: string, accessKey: string): Errors {
  const errors: Errors = {};
  if (!serverUrl.trim()) errors.serverUrl = 'Escribe la dirección del servidor.';
  else if (!parseServerUrl(serverUrl)) {
    errors.serverUrl = 'Usa una dirección que empiece por https:// (por ejemplo https://ejemplo.trycloudflare.com/mcp).';
  }
  if (!accessKey.trim()) errors.accessKey = 'Escribe la clave de acceso.';
  else if (accessKey.trim().length < 24) errors.accessKey = 'La clave tiene al menos 24 caracteres. Revisa que esté completa.';
  return errors;
}

export function SettingsView({ connection, onSaved }: { connection: ConnectionSettingsUseCases; onSaved: () => void }) {
  const heading = useViewHeading<HTMLHeadingElement>('Ajustes');
  const initial = connection.load();
  const [serverUrl, setServerUrl] = useState(initial.serverUrl);
  const [accessKey, setAccessKey] = useState(initial.accessKey);
  const [rememberKey, setRememberKey] = useState(initial.rememberKey);
  const [showKey, setShowKey] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [check, setCheck] = useState<ConnectionCheck | 'testing' | null>(null);
  const urlRef = useRef<HTMLInputElement>(null);
  const keyRef = useRef<HTMLInputElement>(null);

  const submit = async (event?: { preventDefault(): void }) => {
    event?.preventDefault();
    if (check === 'testing') return;
    const found = validate(serverUrl, accessKey);
    setErrors(found);
    if (found.serverUrl) return urlRef.current?.focus();
    if (found.accessKey) return keyRef.current?.focus();
    connection.save({ serverUrl, accessKey, rememberKey });
    onSaved();
    setCheck('testing');
    setCheck(await connection.test({ serverUrl, accessKey }));
  };

  return (
    <>
      <h1 ref={heading} tabIndex={-1}>Ajustes de conexión</h1>
      <p className="lead">Datos que te da el responsable del piloto para conectar la app con el servidor de análisis.</p>
      <form className="stack" onSubmit={(e) => void submit(e)} noValidate>
        <div className="field">
          <label htmlFor="server-url" className="field__label">Dirección del servidor <span className="text-secondary">(obligatoria)</span></label>
          <p id="server-url-hint" className="field__hint">Termina en /mcp. Ejemplo: https://ejemplo.trycloudflare.com/mcp</p>
          <input id="server-url" ref={urlRef} type="url" inputMode="url" autoComplete="url" spellCheck={false}
            value={serverUrl} onChange={(e) => setServerUrl(e.target.value)} required
            aria-invalid={errors.serverUrl ? true : undefined}
            aria-describedby={`server-url-hint${errors.serverUrl ? ' server-url-error' : ''}`} />
          {errors.serverUrl && <p id="server-url-error" className="field__error"><Icon name="error" /> {errors.serverUrl}</p>}
        </div>
        <div className="field">
          <label htmlFor="access-key" className="field__label">Clave de acceso <span className="text-secondary">(obligatoria)</span></label>
          <p id="access-key-hint" className="field__hint">No se guarda en este dispositivo salvo que marques la casilla de abajo.</p>
          <div className="field__row">
            <input id="access-key" ref={keyRef} type={showKey ? 'text' : 'password'} autoComplete="off"
              spellCheck={false} value={accessKey} onChange={(e) => setAccessKey(e.target.value)} required
              aria-invalid={errors.accessKey ? true : undefined}
              aria-describedby={`access-key-hint${errors.accessKey ? ' access-key-error' : ''}`} />
            <button type="button" className="button button--secondary" aria-pressed={showKey}
              aria-controls="access-key" onClick={() => setShowKey((s) => !s)}>
              {showKey ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
          {errors.accessKey && <p id="access-key-error" className="field__error"><Icon name="error" /> {errors.accessKey}</p>}
        </div>
        <label className="choice">
          <input type="checkbox" checked={rememberKey} onChange={(e) => setRememberKey(e.target.checked)} />
          Recordar la clave mientras esta pestaña esté abierta
        </label>
        <div className="actions">
          <button type="submit" className="button button--primary" aria-disabled={check === 'testing'}>
            {check === 'testing' ? 'Probando conexión…' : 'Guardar y probar conexión'}
          </button>
        </div>
      </form>
      <div aria-live="polite">
        {check === 'testing' && <p className="text-secondary" role="status">Conectando con el servidor…</p>}
        {check && check !== 'testing' && check.ok && (
          <Banner tone="success" title="Conexión correcta">
            <p>Los ajustes se guardaron y el servidor respondió con la herramienta de análisis disponible.</p>
          </Banner>
        )}
      </div>
      {check && check !== 'testing' && !check.ok && (
        <div role="alert">
          <FailurePanel failure={check.failure} actions={
            <button type="button" className="button button--secondary" onClick={() => void submit()}>Probar de nuevo</button>
          } />
          <p className="text-secondary">Los ajustes se guardaron igualmente; puedes corregirlos arriba.</p>
        </div>
      )}
    </>
  );
}
