import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useActivityTracker } from './useActivityTracker';

jest.useFakeTimers({ legacyFakeTimers: false });

describe('useActivityTracker', () => {
  beforeEach(() => {
    (global.fetch as any) = jest.fn(() => Promise.resolve({ json: () => ({ sessionId: 'test-session' }) }));
    // mock visibilityState getter and document focus
    Object.defineProperty(document, 'visibilityState', { get: () => 'visible', configurable: true });
    jest.spyOn(document, 'hasFocus').mockReturnValue(true);
  });
  afterEach(() => {
    jest.clearAllTimers();
    jest.resetAllMocks();
  });

  it('démarre une session au premier clic et envoie des événements', async () => {
    const { result } = renderHook(() => useActivityTracker('mail', { inactivityMs: 5000 }));

    // Simule un clic utilisateur
    act(() => {
      const ev = new MouseEvent('click', { bubbles: true });
      window.dispatchEvent(ev);
    });

    // flush microtasks et timers
    await Promise.resolve();

    expect((global.fetch as jest.Mock)).toHaveBeenCalled();
    // Le premier appel devrait être start-session
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe('/api/track/start-session');
  });

  it('termine la session après période d\'inactivité', async () => {
    const { result } = renderHook(() => useActivityTracker('planner', { inactivityMs: 2000 }));
    act(() => window.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await waitFor(() => expect((global.fetch as jest.Mock)).toHaveBeenCalled());

    // Avance le temps > inactivity
    act(() => jest.advanceTimersByTime(3000));
    // Allow pending promises (fetch called asynchronously)
    await Promise.resolve();
    await Promise.resolve();

    // end-session doit avoir été appelé
    const calls = (global.fetch as jest.Mock).mock.calls.map(c => c[0]);
    expect(calls).toContain('/api/track/end-session');
  });
});
