/* src/utils/authPopup.ts
   Opens a popup window to the backend Google OAuth endpoint and resolves with
   the JWT when the popup posts a message back. */

export interface AuthResult {
  token: string;
  user: {
    name: string;
    email: string;
    picture: string;
    sub: string;
  };
}

export function openAuthPopup(authUrl: string): Promise<AuthResult> {
  return new Promise((resolve, reject) => {
    const popup = window.open(
      authUrl,
      'google-auth',
      'width=500,height=600,scrollbars=yes,resizable=yes,left=' +
      (window.screen.width / 2 - 250) + ',top=' +
      (window.screen.height / 2 - 300)
    );

    if (!popup) {
      reject(new Error('Popup blocked'));
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      // Check origin for security
      if (event.origin !== window.location.origin && 
          !event.origin.includes('anemoias.me') && 
          !event.origin.includes('anemoia-api.onrender.com')) {
        return;
      }

      if (event.data && event.data.token) {
        // Clean up
        window.removeEventListener('message', handleMessage);
        popup.close();
        
        // Parse user info from JWT token
      try {
          const payload = JSON.parse(atob(event.data.token.split('.')[1]));
          const user = {
            name: payload.name || 'User',
            email: payload.email || '',
            picture: payload.picture || '/A_logo.png',
            sub: payload.sub || payload.user_id || ''
          };
          
          resolve({
            token: event.data.token,
            user
          });
        } catch (error) {
          reject(new Error('Invalid token format'));
        }
      }
    };

    window.addEventListener('message', handleMessage);

    // Check if popup was closed without authentication
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        window.removeEventListener('message', handleMessage);
        reject(new Error('Authentication cancelled'));
      }
    }, 1000);
  });
} 