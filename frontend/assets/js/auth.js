/**
 * Module d'authentification (login, logout, register).
 */

const Auth = {
    /**
     * Connecte un utilisateur.
     */
    async login(email, password) {
        const data = await Api.postPublic('/login', { email, password });

        Storage.setToken(data.token);
        Storage.setUser(data.user);

        return data.user;
    },

    /**
     * Inscrit un nouvel utilisateur (optionnel).
     */
    async register(payload) {
        const data = await Api.postPublic('/register', payload);

        Storage.setToken(data.token);
        Storage.setUser(data.user);

        return data.user;
    },

    /**
     * Récupère l'utilisateur connecté depuis l'API.
     */
    async me() {
        const data = await Api.get('/me');
        Storage.setUser(data.user);
        return data.user;
    },

    /**
     * Déconnecte l'utilisateur.
     */
    async logout() {
        try {
            await Api.post('/logout');
        } catch (e) {
            // Ignorer les erreurs (token déjà expiré)
        } finally {
            Storage.clear();
            window.location.href = CONFIG.ROUTES.LOGIN;
        }
    },
};