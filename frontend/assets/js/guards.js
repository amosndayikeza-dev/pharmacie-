/**
 * Protection des pages (auth + rôles).
 *
 * À inclure EN HAUT de chaque page protégée.
 */

const Guard = {
    /**
     * Exige un utilisateur connecté. Sinon → redirection login.
     */
    requireAuth() {
        if (!Storage.isAuthenticated()) {
            window.location.href = CONFIG.ROUTES.LOGIN;
            return false;
        }
        return true;
    },

    /**
     * Redirige vers le dashboard si déjà connecté.
     * Utile pour la page de login.
     */
    redirectIfAuthenticated() {
        if (Storage.isAuthenticated()) {
            window.location.href = CONFIG.ROUTES.DASHBOARD;
            return true;
        }
        return false;
    },

    /**
     * Exige un rôle spécifique.
     * Usage : Guard.requireRole('Administrateur', 'Pharmacien')
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