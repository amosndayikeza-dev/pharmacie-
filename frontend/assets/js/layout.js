/**
 * ============================================================
 * GESTION DU THÈME (clair / sombre)
 * ============================================================
 */

const Theme = {
    STORAGE_KEY: 'lgo_theme',

    init() {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        const theme = saved
            ? saved
            : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        this.apply(theme);
    },

    apply(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(this.STORAGE_KEY, theme);
        this.updateIcon(theme);
    },

    toggle() {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        this.apply(current === 'dark' ? 'light' : 'dark');
    },

    updateIcon(theme) {
        const btn = document.getElementById('themeToggle');
        if (!btn) return;

        const iconName = theme === 'dark' ? 'sun' : 'moon';
        const iconEl = btn.querySelector('[data-icon]');
        if (iconEl && typeof Icons !== 'undefined' && Icons[iconName]) {
            iconEl.innerHTML = Icons[iconName];
        }

        const labelEl = btn.querySelector('.theme-label');
        if (labelEl) {
            labelEl.textContent = theme === 'dark' ? 'Thème clair' : 'Thème sombre';
        }
    },

    current() {
        return document.documentElement.getAttribute('data-theme') || 'light';
    },
};

// Application IMMÉDIATE (évite le flash de thème)
Theme.init();


/**
 * ============================================================
 * LAYOUT — Monte les composants + gère les comportements
 * ============================================================
 */

const Layout = {

    /**
     * Monte le layout sur la page.
     *
     * @param {object} options
     * @param {string} options.activePage   Nom de la page active (sans .html)
     * @param {string} options.title        Titre du header
     * @param {string} options.breadcrumb   Sous-titre du header
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

        // Injecter la modale de déconnexion (une seule fois)
        this.injectLogoutModal();

        // Initialiser les comportements
        this.setupSidebar();
        this.setupUserMenu();
        this.setupTheme();
        this.renderUser();
    },

    // ============================================================
    // MODALE DE DÉCONNEXION
    // ============================================================

    /**
     * Injecte la modale de déconnexion dans le DOM (une seule fois).
     */
    injectLogoutModal() {
        if (document.getElementById('logoutModal')) return;

        const modal = document.createElement('div');
        modal.id = 'logoutModal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal modal-sm">
                <div class="modal-header">
                    <h3 class="modal-title">
                        <span data-icon="logout"></span>
                        Déconnexion
                    </h3>
                    <button class="modal-close" type="button" data-action="close-logout">
                        <span data-icon="close"></span>
                    </button>
                </div>

                <div class="modal-body">
                    <div class="logout-content">
                        <div class="logout-icon">
                            <span data-icon="logout"></span>
                        </div>
                        <h4 class="logout-title">Voulez-vous vraiment vous déconnecter ?</h4>
                        <p class="logout-text">
                            Vous serez redirigé vers la page de connexion.<br>
                            Toute modification non enregistrée sera perdue.
                        </p>
                    </div>
                </div>

                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-action="close-logout">
                        Annuler
                    </button>
                    <button type="button" class="btn btn-danger" data-action="confirm-logout">
                        <span data-icon="logout"></span>
                        Se déconnecter
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Réinjecter les icônes SVG
        modal.querySelectorAll('[data-icon]').forEach(el => {
            const name = el.getAttribute('data-icon');
            if (typeof Icons !== 'undefined' && Icons[name]) {
                el.innerHTML = Icons[name];
            }
        });

        // ─── Boutons "Annuler" et ✕ ───
        modal.querySelectorAll('[data-action="close-logout"]').forEach(btn => {
            btn.addEventListener('click', () => this.closeLogoutModal());
        });

        // ─── Bouton "Se déconnecter" ───
        modal.querySelector('[data-action="confirm-logout"]').addEventListener('click', () => {
            if (typeof Auth !== 'undefined' && Auth.logout) {
                Auth.logout();
            } else {
                localStorage.clear();
                window.location.href = '/frontend/index.html';
            }
        });

        // ─── Fermer au clic sur l'overlay ───
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeLogoutModal();
        });

        // ─── Fermer avec Échap ───
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('open')) {
                this.closeLogoutModal();
            }
        });
    },

    /**
     * Ouvre la modale de déconnexion.
     */
    openLogoutModal() {
        document.getElementById('logoutModal')?.classList.add('open');
    },

    /**
     * Ferme la modale de déconnexion.
     */
    closeLogoutModal() {
        document.getElementById('logoutModal')?.classList.remove('open');
    },

    // ============================================================
    // SIDEBAR
    // ============================================================

    setupSidebar() {
        const layout  = document.getElementById('appLayout');
        const toggle  = document.getElementById('sidebarToggle');
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

    // ============================================================
    // MENU UTILISATEUR
    // ============================================================

    setupUserMenu() {
        const trigger  = document.getElementById('userTrigger');
        const dropdown = document.getElementById('userDropdown');

        if (!trigger || !dropdown) return;

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('open');
        });

        // Fermer au clic ailleurs
        document.addEventListener('click', () => {
            dropdown.classList.remove('open');
        });

        dropdown.addEventListener('click', (e) => e.stopPropagation());

        // ─── Bouton "Se déconnecter" ───
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                // Fermer le dropdown avant d'ouvrir la modale
                dropdown.classList.remove('open');

                // ⚠️ Ouvre la modale de déconnexion (méthode du Layout)
                this.openLogoutModal();
            });
        }
    },

    // ============================================================
    // THÈME
    // ============================================================

    setupTheme() {
        const btn = document.getElementById('themeToggle');
        if (!btn) return;

        // Éviter les doubles listeners
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);

        newBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Empêche la fermeture du dropdown
            Theme.toggle();
        });

        Theme.updateIcon(Theme.current());
    },

    // ============================================================
    // AFFICHAGE UTILISATEUR
    // ============================================================

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
 * ============================================================
 * VÉRIFICATION D'ACCÈS PAR PAGE
 * ============================================================
 */

function checkPageAccess() {
    const user = Storage.getUser();
    if (!user) return;

    const adminPages = ['utilisateurs.html', 'logs.html'];
    const staffPages = [
        'rapports.html', 'mouvements.html', 'exports.html',
        'fournisseurs.html', 'achats.html', 'receptions.html',
        'lots.html', 'parametres.html'
    ];

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