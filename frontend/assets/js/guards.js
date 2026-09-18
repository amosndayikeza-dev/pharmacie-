/**
 * Protection des pages (auth + rôles).
 */

const Guard = {
    /**
     * Exige un utilisateur connecté. Sinon → redirection login.
     */
    requireAuth() {
        const currentPage = window.location.pathname.split('/').pop() || '';

        // Déjà sur login : ne pas boucler
        if (currentPage === 'index.html' || currentPage === '') {
            return true;
        }

        if (!Storage.isAuthenticated()) {
            window.location.href = CONFIG.ROUTES.LOGIN;
            return false;
        }
        return true;
    },

    /**
     * Redirige vers dashboard si déjà connecté.
     */
    redirectIfAuthenticated() {
        const currentPage = window.location.pathname.split('/').pop() || '';

        // Déjà sur dashboard : ne pas boucler
        if (currentPage === 'dashboard.html') {
            return false;
        }

        if (Storage.isAuthenticated()) {
            window.location.href = CONFIG.ROUTES.DASHBOARD;
            return true;
        }
        return false;
    },

    /**
     * Exige un rôle spécifique.
     */
    requireRole(...roles) {
        if (!this.requireAuth()) return false;

        const user = Storage.getUser();
        if (!user || !roles.includes(user.role)) {
            window.location.href = CONFIG.ROUTES.FORBIDDEN;
            return false;
        }
        return true;
    },
};