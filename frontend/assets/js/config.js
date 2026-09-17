/**
 * Configuration globale du frontend.
 *
 * ⚠️ En production, remplacer par l'URL réelle de l'API.
 */
const CONFIG = {
    API_BASE_URL: 'http://127.0.0.1:8000/api/v1',
    API_TIMEOUT: 30000, // 30 secondes
    APP_NAME: 'LGO Pharmacie Vétérinaire',
    STORAGE_KEYS: {
        TOKEN: 'lgo_auth_token',
        USER: 'lgo_auth_user',
    },
    ROUTES: {
        LOGIN:      '/index.html',
        DASHBOARD:  '/pages/dashboard.html',
        FORBIDDEN:  '/pages/forbidden.html',
        NOT_FOUND:  '/pages/not-found.html',
    },
};