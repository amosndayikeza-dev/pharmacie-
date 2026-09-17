/**
 * Layout — Sidebar, header, menu utilisateur.
 */

const Layout = {
    /**
     * Initialise le layout.
     */
    init() {
        this.setupSidebar();
        this.setupUserMenu();
        this.setupActiveLink();
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
            toggle.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    // Mobile : ouvrir/fermer en overlay
                    layout.classList.toggle('sidebar-open');
                } else {
                    // Desktop : réduire/agrandir
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

        // Fermer en cliquant ailleurs
        document.addEventListener('click', () => {
            dropdown.classList.remove('open');
        });

        dropdown.addEventListener('click', (e) => e.stopPropagation());
    },

    /**
     * Marque le lien actif selon l'URL.
     */
    setupActiveLink() {
        const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';

        document.querySelectorAll('.sidebar-link').forEach(link => {
            link.classList.remove('active');
            const href = link.getAttribute('href') || '';
            if (href.endsWith(currentPage)) {
                link.classList.add('active');
            }
        });
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