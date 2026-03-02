import { GOOGLE_MAPS_API_KEY } from '../config/google';

let googleMapsPromise = null;

export function loadGoogleMapsApi() {
    if (window.google && window.google.maps) {
        return Promise.resolve(window.google.maps);
    }

    if (googleMapsPromise) {
        return googleMapsPromise;
    }

    if (!GOOGLE_MAPS_API_KEY) {
        return Promise.reject(new Error('Falta REACT_APP_GOOGLE_MAPS_API_KEY'));
    }

    googleMapsPromise = new Promise((resolve, reject) => {
        const existingScript = document.getElementById('google-maps-script');
        if (existingScript) {
            existingScript.addEventListener('load', () => resolve(window.google.maps), { once: true });
            existingScript.addEventListener('error', () => reject(new Error('No se pudo cargar Google Maps')), { once: true });
            return;
        }

        const script = document.createElement('script');
        script.id = 'google-maps-script';
        script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}&v=weekly`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
            if (window.google && window.google.maps) {
                resolve(window.google.maps);
                return;
            }
            reject(new Error('Google Maps no se inicializo correctamente'));
        };
        script.onerror = () => reject(new Error('No se pudo cargar Google Maps'));

        document.head.appendChild(script);
    });

    return googleMapsPromise;
}
