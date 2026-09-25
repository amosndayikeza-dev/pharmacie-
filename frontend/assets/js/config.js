/**
 * Configuration globale du frontend.
 *
 *  IMPORTANT : les ROUTES utilisent des CHEMINS ABSOLUS.
 * Préfixe /frontend/ car Live Server sert depuis la racine pharmacie/.
 *
 * Ainsi, les redirections fonctionnent depuis N'IMPORTE QUELLE page :
 *   - /frontend/index.html          (login)
 *   - /frontend/pages/dashboard.html
 *   - /frontend/pages/medicaments.html
 *   - etc.
 */

const CONFIG = {
    API_BASE_URL: 'http://127.0.0.1:8000/api/v1',
    APP_NAME: 'LGO Pharmacie Vétérinaire',

    STORAGE_KEYS: {
        TOKEN: 'lgo_auth_token',
        USER:  'lgo_auth_user',
    },

    //  CHEMINS ABSOLUS (commencent par /) — ne jamais utiliser de chemins relatifs
    ROUTES: {
        LOGIN:      '/frontend/index.html',
        DASHBOARD:  '/frontend/pages/dashboard.html',
        FORBIDDEN:  '/frontend/pages/forbidden.html',
        NOT_FOUND:  '/frontend/pages/not-found.html',
    },
};

/**
 * Redirige vers une route.
 *
 * Fonction centrale utilisée partout dans l'app pour naviguer.
 * Reçoit un chemin absolu (ex: CONFIG.ROUTES.DASHBOARD).
 *
 * @param {string} route
 */
function goTo(route) {
    window.location.href = route;
}