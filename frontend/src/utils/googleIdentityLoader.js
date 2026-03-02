let googleIdentityPromise = null;

export function loadGoogleIdentityApi() {
    if (window.google && window.google.accounts && window.google.accounts.id) {
        return Promise.resolve(window.google.accounts.id);
    }

    if (googleIdentityPromise) {
        return googleIdentityPromise;
    }

    googleIdentityPromise = new Promise((resolve, reject) => {
        const existingScript = document.getElementById('google-identity-script');
        if (existingScript) {
            existingScript.addEventListener('load', () => resolve(window.google.accounts.id), { once: true });
            existingScript.addEventListener('error', () => reject(new Error('No se pudo cargar Google Identity')), { once: true });
            return;
        }

        const script = document.createElement('script');
        script.id = 'google-identity-script';
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => {
            if (window.google && window.google.accounts && window.google.accounts.id) {
                resolve(window.google.accounts.id);
                return;
            }
            reject(new Error('Google Identity no se inicializo correctamente'));
        };
        script.onerror = () => reject(new Error('No se pudo cargar Google Identity'));

        document.head.appendChild(script);
    });

    return googleIdentityPromise;
}
