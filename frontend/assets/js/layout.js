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

        // Remplir les placeholders
        const sidebarEl = document.getElementById('appSidebar');
        const headerEl  = document.getElementById('appHeader');
        const footerEl  = document.getElementById('appFooter');

        if (sidebarEl) sidebarEl.innerHTML = Components.sidebar(activePage);
        if (headerEl)  headerEl.innerHTML  = Components.header({ title, breadcrumb });
        if (footerEl)  footerEl.innerHTML  = Components.footer();

        // Injecter les icônes dans les composants
        document.querySelectorAll('[data-icon]').forEach(el => {
            const name = el.getAttribute('data-icon');
            if (typeof Icons !== 'undefined' && Icons[name]) {
                el.innerHTML = Icons[name];
            }
        });

        // Initialiser les comportements
        this.setupSidebar();
        this.setupUserMenu();
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