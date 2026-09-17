/**
 * Gestion du stockage local (token + user).
 *
 * ⚠️ Sécurité : localStorage est vulnérable aux XSS.
 * Pour un projet critique, utiliser des cookies httpOnly.
 */

const Storage = {
    /**
     * Sauvegarde le token d'authentification.
     */
    setToken(token) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.TOKEN, token);
    },

    /**
     * Récupère le token.
     */
    getToken() {
        return localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
    },

    /**
     * Supprime le token.
     */
    removeToken() {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
    },

    /**
     * Sauvegarde les infos utilisateur.
     */
    setUser(user) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(user));
    },

    /**
     * Récupère les infos utilisateur.
     */
    getUser() {
        const user = localStorage.getItem(CONFIG.STORAGE_KEYS.USER);
        return user ? JSON.parse(user) : null;
    },

    /**
     * Supprime les infos utilisateur.
     */
    removeUser() {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
    },

    /**
     * Vérifie si un token existe.
     */
    isAuthenticated() {
        return !!this.getToken();
    },

    /**
     * Nettoie tout (déconnexion).
     */
    clear() {
        this.removeToken();
        this.removeUser();
    },
};