/**
 * Client HTTP pour communiquer avec l'API Laravel.
 *
 * Gère automatiquement :
 *  - Le token Bearer
 *  - Les erreurs JSON
 *  - La redirection en cas de 401 (avec anti-boucle)
 */

const Api = {

    /**
     * Effectue une requête HTTP vers l'API.
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

        if (requiresAuth) {
            const token = Storage.getToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }

        const config = { method, headers };
        if (body) config.body = JSON.stringify(body);

        let response;
        try {
            response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, config);
        } catch (networkError) {
            throw {
                status: 0,
                message: 'Impossible de contacter le serveur. Vérifiez que Laravel tourne (php artisan serve).',
                errors: {},
            };
        }

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            // 401 : token invalide ou expiré
            if (response.status === 401 && requiresAuth) {
                Storage.clear();

                const currentPage = window.location.pathname.split('/').pop() || '';
                if (currentPage !== 'index.html' && currentPage !== '') {
                    setTimeout(() => {
                        window.location.href = CONFIG.ROUTES.LOGIN;
                    }, 200);
                }

                throw {
                    status: 401,
                    message: 'Session expirée. Veuillez vous reconnecter.',
                    errors: {},
                };
            }

            // Tous les autres codes (500, 404, 422...)
            throw {
                status:  response.status,
                message: data.message || `Erreur ${response.status}`,
                errors:  data.errors || {},
            };
        }

        return data;
    },

    // ============================================================
    // RACCOURCIS
    // ============================================================

    get:    (url)        => Api.request(url, { method: 'GET' }),
    post:   (url, body)  => Api.request(url, { method: 'POST', body }),
    put:    (url, body)  => Api.request(url, { method: 'PUT', body }),
    patch:  (url, body)  => Api.request(url, { method: 'PATCH', body }),
    delete: (url)        => Api.request(url, { method: 'DELETE' }),

    // Sans authentification
    postPublic: (url, body) => Api.request(url, { method: 'POST', body, requiresAuth: false }),
};