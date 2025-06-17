/* src/utils/authPopup.ts
   Opens a popup window to the backend Google OAuth endpoint and resolves with
   the JWT when the popup posts a message back. */

const POPUP_WIDTH = 500;
const POPUP_HEIGHT = 600;

export function openAuthPopup(authUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const dualScreenLeft = window.screenLeft ?? window.screenX ?? 0;
    const dualScreenTop = window.screenTop ?? window.screenY ?? 0;

    const width = window.innerWidth ?? document.documentElement.clientWidth ?? screen.width;
    const height = window.innerHeight ?? document.documentElement.clientHeight ?? screen.height;

    const systemZoom = width / window.screen.availWidth;

    const left = (width - POPUP_WIDTH) / 2 / systemZoom + dualScreenLeft;
    const top = (height - POPUP_HEIGHT) / 2 / systemZoom + dualScreenTop;

    const popup = window.open(
      authUrl,
      'anemoia_google_login',
      `scrollbars=yes, width=${POPUP_WIDTH / systemZoom}, height=${POPUP_HEIGHT / systemZoom}, top=${top}, left=${left}`
    );

    if (!popup) {
      return reject(new Error('Failed to open authentication window'));
    }

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Login timed out'));
    }, 2 * 60 * 1000); // 2 minutes

    function cleanup() {
      clearTimeout(timeout);
      window.removeEventListener('message', onMessage);
    }

    function onMessage(e: MessageEvent) {
      try {
        console.log('Popup message received:', e.data, 'from origin:', e.origin);
        const originOk = new URL(authUrl).origin === e.origin;
        console.log('Origin check:', originOk, 'expected:', new URL(authUrl).origin);
        if (!originOk) return; // ignore other origins
        const { token } = e.data || {};
        if (typeof token === 'string') {
          console.log('Valid token received, closing popup');
          cleanup();
          resolve(token);
          if (popup && !popup.closed) {
            popup.close();
          }
        }
      } catch {
        console.warn('Error processing popup message:', e);
      }
    }

    window.addEventListener('message', onMessage, false);
  });
} 