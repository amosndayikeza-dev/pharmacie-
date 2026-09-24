/**
 * Gestion du thème clair / sombre.
 *
 * - Persistance dans localStorage (clé : lgo_theme)
 * - Respect de la préférence système au premier chargement
 * - Application immédiate sur <html data-theme="...">
 */
const Theme = {
    STORAGE_KEY: 'lgo_theme',

    /**
     * Initialise le thème au chargement de la page.
     */
    init() {
        const saved = localStorage.getItem(this.STORAGE_KEY);

        const theme = saved
            ? saved
            : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

        this.apply(theme);
    },

    /**
     * Applique un thème.
     */
    apply(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(this.STORAGE_KEY, theme);
        this.updateIcon(theme);
    },

    /**
     * Bascule entre clair et sombre.
     */
    toggle() {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        this.apply(next);
    },

    /**
     * Met à jour l'icône du bouton.
     */
    updateIcon(theme) {
        const btn = document.getElementById('themeToggle');
        if (!btn) return;

        // Icône
        const iconName = theme === 'dark' ? 'sun' : 'moon';
        const iconEl = btn.querySelector('[data-icon]');
        if (iconEl && typeof Icons !== 'undefined' && Icons[iconName]) {
            iconEl.innerHTML = Icons[iconName];
        }

        // Texte
        const labelEl = btn.querySelector('.theme-label');
        if (labelEl) {
            labelEl.textContent = theme === 'dark' ? 'Thème clair' : 'Thème sombre';
        }
    },

    /**
     * Retourne le thème courant.
     */
    current() {
        return document.documentElement.getAttribute('data-theme') || 'light';
    },
};

// ⚠️ Application IMMÉDIATE (avant le DOMContentLoaded) pour éviter le flash
Theme.init();


/**
 * Layout — Monte les composants (sidebar, header, footer)
 * puis initialise les comportements (toggle, dropdown, etc.).
 */

const Layout = {

    /**
     * Monte le layout sur la page.
     *
     * @param {object} options
     * @param {string} options.activePage    Nom de la page active (sans .html)
     * @param {string} options.title         Titre du header
     * @param {string} options.breadcrumb    Sous-titre du header
     */
        mount(options = {}) {
        const { activePage = '', title = '', breadcrumb = '' } = options;

        const sidebarEl = document.getElementById('appSidebar');
        const headerEl  = document.getElementById('appHeader');
        const footerEl  = document.getElementById('appFooter');

        if (sidebarEl) sidebarEl.innerHTML = Components.sidebar(activePage);
        if (headerEl)  headerEl.innerHTML  = Components.header({ title, breadcrumb });
        if (footerEl)  footerEl.innerHTML  = Components.footer();

        // Injecter les icônes
        document.querySelectorAll('[data-icon]').forEach(el => {
            const name = el.getAttribute('data-icon');
            if (typeof Icons !== 'undefined' && Icons[name]) {
                el.innerHTML = Icons[name];
            }
        });

        this.setupSidebar();
        this.setupUserMenu();
        this.setupTheme();
        this.renderUser();
    },

    /**
     * Sidebar : toggle + responsive.
     */
    setupSidebar() {
        const layout = document.getElementById('appLayout');
        const toggle = document.getElementById('sidebarToggle');
        const overlay = document.getElementById('sidebarOverlay');

        if (toggle) {
            // Éviter les doubles listeners
            toggle.replaceWith(toggle.cloneNode(true));
            const newToggle = document.getElementById('sidebarToggle');

            newToggle.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    layout.classList.toggle('sidebar-open');
                } else {
                    layout.classList.toggle('sidebar-collapsed');
                    localStorage.setItem('sidebar_collapsed',
                        layout.classList.contains('sidebar-collapsed'));
                }
            });
        }

        if (overlay) {
            overlay.addEventListener('click', () => {
                layout.classList.remove('sidebar-open');
            });
        }

        // Restaurer l'état réduit sur desktop
        if (window.innerWidth > 768 &&
            localStorage.getItem('sidebar_collapsed') === 'true') {
            layout.classList.add('sidebar-collapsed');
        }
    },

    /**
     * Menu utilisateur (dropdown).
     */
    setupUserMenu() {
        const trigger = document.getElementById('userTrigger');
        const dropdown = document.getElementById('userDropdown');

        if (!trigger || !dropdown) return;

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('open');
        });

        document.addEventListener('click', () => {
            dropdown.classList.remove('open');
        });

        dropdown.addEventListener('click', (e) => e.stopPropagation());

        // Déconnexion
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
                    Auth.logout();
                }
            });
        }
    },


        /**
     * Branche le bouton de bascule de thème.
     */
        setupTheme() {
        const btn = document.getElementById('themeToggle');
        if (!btn) return;

        // Éviter les doubles listeners
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);

        newBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // ⚠️ Empêche la fermeture du dropdown
            Theme.toggle();
        });

        // Mettre à jour l'apparence du bouton
        Theme.updateIcon(Theme.current());
    },

    /**
     * Affiche le nom et le rôle de l'utilisateur dans le header.
     */
    renderUser() {
        const user = Storage.getUser();
        if (!user) return;

        const nomComplet = user.nom_complet || `${user.prenom} ${user.nom}`;
        const initiales = ((user.prenom?.[0] || '') + (user.nom?.[0] || '')).toUpperCase();

        document.querySelectorAll('.user-name').forEach(el => el.textContent = nomComplet);
        document.querySelectorAll('.user-role').forEach(el => el.textContent = user.role);
        document.querySelectorAll('.user-avatar').forEach(el => el.textContent = initiales);
    },
};


/**
 * Vérifie que l'utilisateur a le droit d'accéder à cette page.
 * Redirige vers le dashboard si non autorisé.
 */
function checkPageAccess() {
    const user = Storage.getUser();
    if (!user) return; // Guard.requireAuth() gère déjà ça

    // Pages réservées à l'Admin
    const adminPages = ['utilisateurs.html', 'logs.html'];
    // Pages Admin + Pharmacien
    const staffPages = ['rapports.html', 'mouvements.html', 'exports.html',
                        'fournisseurs.html', 'achats.html', 'receptions.html',
                        'lots.html', 'parametres.html'];

    const currentPage = window.location.pathname.split('/').pop();

    if (adminPages.includes(currentPage) && user.role !== 'Administrateur') {
        Toast.error('Accès refusé.');
        setTimeout(() => window.location.href = 'dashboard.html', 1000);
        return false;
    }

    if (staffPages.includes(currentPage)
        && !['Administrateur', 'Pharmacien'].includes(user.role)) {
        Toast.error('Accès refusé.');
        setTimeout(() => window.location.href = 'dashboard.html', 1000);
        return false;
    }

    return true;
}