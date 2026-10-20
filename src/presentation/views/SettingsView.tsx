import { useRef, useState } from 'react';
import type { ConnectionCheck, ConnectionSettingsUseCases } from '../../application/connection';
import { parseServerUrl } from '../../application/serverUrl';
import { Banner, FailurePanel } from '../components/Feedback';
import { Icon } from '../components/Icon';
import { useViewHeading } from '../hooks';
import { useI18n } from '../i18n/I18nProvider';

type Field = 'serverUrl' | 'accessKey';
type ErrorKey = 'serverMissing' | 'serverInvalid' | 'keyMissing' | 'keyShort';
type Errors = Partial<Record<Field, ErrorKey>>;

/** Returns message keys, not text, so errors re-render in the new language if the user switches. */
function validate(serverUrl: string, accessKey: string): Errors {
  const errors: Errors = {};
  if (!serverUrl.trim()) errors.serverUrl = 'serverMissing';
  else if (!parseServerUrl(serverUrl)) errors.serverUrl = 'serverInvalid';
  if (!accessKey.trim()) errors.accessKey = 'keyMissing';
  else if (accessKey.trim().length < 24) errors.accessKey = 'keyShort';
  return errors;
}

export function SettingsView({ connection, onSaved }: { connection: ConnectionSettingsUseCases; onSaved: () => void }) {
  const { t } = useI18n();
  const s = t.settings;
  const heading = useViewHeading<HTMLHeadingElement>(s.docTitle);
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
      <h1 ref={heading} tabIndex={-1}>{s.title}</h1>
      <p className="lead">{s.lead}</p>
      <form className="stack" onSubmit={(e) => void submit(e)} noValidate>
        <div className="field">
          <label htmlFor="server-url" className="field__label">{s.serverLabel} <span className="text-secondary">{s.required}</span></label>
          <p id="server-url-hint" className="field__hint">{s.serverHint}</p>
          <input id="server-url" ref={urlRef} type="url" inputMode="url" autoComplete="url" spellCheck={false}
            value={serverUrl} onChange={(e) => setServerUrl(e.target.value)} required
            aria-invalid={errors.serverUrl ? true : undefined}
            aria-describedby={`server-url-hint${errors.serverUrl ? ' server-url-error' : ''}`} />
          {errors.serverUrl && <p id="server-url-error" className="field__error"><Icon name="error" /> {s.errors[errors.serverUrl]}</p>}
        </div>
        <div className="field">
          <label htmlFor="access-key" className="field__label">{s.keyLabel} <span className="text-secondary">{s.required}</span></label>
          <p id="access-key-hint" className="field__hint">{s.keyHint}</p>
          <div className="field__row">
            <input id="access-key" ref={keyRef} type={showKey ? 'text' : 'password'} autoComplete="off"
              spellCheck={false} value={accessKey} onChange={(e) => setAccessKey(e.target.value)} required
              aria-invalid={errors.accessKey ? true : undefined}
              aria-describedby={`access-key-hint${errors.accessKey ? ' access-key-error' : ''}`} />
            <button type="button" className="button button--secondary" aria-pressed={showKey}
              aria-controls="access-key" onClick={() => setShowKey((v) => !v)}>
              {showKey ? s.hide : s.show}
            </button>
          </div>
          {errors.accessKey && <p id="access-key-error" className="field__error"><Icon name="error" /> {s.errors[errors.accessKey]}</p>}
        </div>
        <label className="choice">
          <input type="checkbox" checked={rememberKey} onChange={(e) => setRememberKey(e.target.checked)} />
          {s.remember}
        </label>
        <div className="actions">
          <button type="submit" className="button button--primary" aria-disabled={check === 'testing'}>
            {check === 'testing' ? s.testing : s.save}
          </button>
        </div>
      </form>
      <div aria-live="polite">
        {check === 'testing' && <p className="text-secondary" role="status">{s.connecting}</p>}
        {check && check !== 'testing' && check.ok && (
          <Banner tone="success" title={s.okTitle}>
            <p>{s.okBody}</p>
          </Banner>
        )}
      </div>
      {check && check !== 'testing' && !check.ok && (
        <div role="alert">
          <FailurePanel failure={check.failure} actions={
            <button type="button" className="button button--secondary" onClick={() => void submit()}>{s.tryAgain}</button>
          } />
          <p className="text-secondary">{s.savedAnyway}</p>
        </div>
      )}
    </>
  );
}
