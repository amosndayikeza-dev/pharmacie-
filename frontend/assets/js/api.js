/**
 * Client HTTP pour communiquer avec l'API Laravel.
 *
 * Gère automatiquement :
 *  - Le token Bearer
 *  - Les erreurs JSON
 *  - La redirection en cas de 401
 */

const Api = {
    /**
     * Effectue une requête HTTP vers l'API.
     *
     * @param {string} endpoint  ex: '/login'
     * @param {object} options   { method, body, requiresAuth }
     */
    async request(endpoint, options = {}) {
        const {
            method = 'GET',
            body = null,
            requiresAuth = true,
        } = options;

        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        };

        // Ajouter le token si requête protégée
        if (requiresAuth) {
            const token = Storage.getToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }

        const config = { method, headers };

        if (body) {
            config.body = JSON.stringify(body);
        }

        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, config);
            const data = await response.json().catch(() => ({}));

            // Gestion des erreurs HTTP
            if (!response.ok) {
                // 401 : token expiré ou invalide → redirection login
                if (response.status === 401 && requiresAuth) {
                    Storage.clear();
                    goTo(CONFIG.ROUTES.LOGIN);
                    return;
                }

                // Lever une erreur structurée
                throw {
                    status: response.status,
                    message: data.message || `Erreur ${response.status}`,
                    errors: data.errors || {},
                };
            }

            return data;
        } catch (error) {
            // Erreur réseau
            if (!error.status) {
                throw {
                    status: 0,
                    message: 'Impossible de contacter le serveur. Vérifiez votre connexion.',
                    errors: {},
                };
            }
            throw error;
        }
    },

    // Raccourcis
    get:    (url)        => Api.request(url, { method: 'GET' }),
    post:   (url, body)  => Api.request(url, { method: 'POST', body }),
    put:    (url, body)  => Api.request(url, { method: 'PUT', body }),
    patch:  (url, body)  => Api.request(url, { method: 'PATCH', body }),
    delete: (url)        => Api.request(url, { method: 'DELETE' }),

    // Version sans authentification
    postPublic: (url, body) => Api.request(url, { method: 'POST', body, requiresAuth: false }),
};