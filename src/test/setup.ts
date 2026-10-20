import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// jsdom has no object URLs; the app only needs them for the in-memory preview.
URL.createObjectURL ??= () => 'blob:preview';
URL.revokeObjectURL ??= () => undefined;

afterEach(() => {
  cleanup();
  window.location.hash = '';
  localStorage.clear();
  sessionStorage.clear();
});
