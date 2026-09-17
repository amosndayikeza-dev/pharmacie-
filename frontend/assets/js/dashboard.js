/**
 * Logique du tableau de bord.
 */

// === 1. Protéger la page ===
Guard.requireAuth();

// === 2. Initialisation au chargement ===
document.addEventListener('DOMContentLoaded', async () => {
    // Afficher les infos mises en cache immédiatement
    renderUser(Storage.getUser());

    // Rafraîchir depuis l'API (source de vérité)
    try {
        const user = await Auth.me();
        renderUser(user);
    } catch (e) {
        // Si erreur, redirection déjà gérée par Api (401)
    }

    // Déconnexion
    document.getElementById('logoutBtn').addEventListener('click', () => {
        if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
            Auth.logout();
        }
    });
});

/**
 * Affiche les infos utilisateur dans le DOM.
 */
function renderUser(user) {
    if (!user) return;

    const nomComplet = user.nom_complet || `${user.prenom} ${user.nom}`;

    document.getElementById('userName').textContent = nomComplet;
    document.getElementById('userRole').textContent = user.role;
    document.getElementById('welcomeMessage').textContent = `Bienvenue, ${nomComplet} !`;
    document.getElementById('infoName').textContent = nomComplet;
    document.getElementById('infoEmail').textContent = user.email;
    document.getElementById('infoRole').textContent = user.role;

    const lastLogin = user.derniere_connexion
        ? new Date(user.derniere_connexion).toLocaleString('fr-FR')
        : 'Première connexion';
    document.getElementById('infoLastLogin').textContent = lastLogin;
}