/**
 * Composants réutilisables du layout.
 *
 * Évite la duplication du HTML entre les pages.
 * Chaque composant est une fonction qui retourne une chaîne HTML.
 *
 * Usage :
 *   document.getElementById('appSidebar').innerHTML = Components.sidebar('medicaments');
 */

const Components = {

    // ============================================================
    // SIDEBAR
    // ============================================================

    /**
     * @param {string} activePage  Page active (nom du fichier sans .html)
     * @returns {string} HTML
     */
    sidebar(activePage = '') {
        const links = [
            {
                section: 'Principal',
                items: [
                    { href: 'dashboard.html',    icon: 'dashboard',    label: 'Tableau de bord' },
                    { href: 'caisse.html',       icon: 'caisse',       label: 'Caisse' },
                    { href: 'ventes.html',       icon: 'ventes',       label: 'Ventes' },
                ],
            },
            {
                section: 'Gestion',
                items: [
                    { href: 'medicaments.html',  icon: 'medicaments',  label: 'Médicaments' },
                    { href: 'lots.html',         icon: 'lots',         label: 'Lots & Stock', badgeId: 'badgeAlertes' },
                    { href: 'animaux.html',      icon: 'animaux',      label: 'Animaux' },
                    { href: 'proprietaires.html', icon: 'proprietaires', label: 'Propriétaires' },
                    { href: 'especes.html', icon: 'especes', label: 'Espèces' },
                    { href: 'ordonnances.html', icon: 'fileText', label: 'Ordonnances' },
                    { href: 'vaccinations.html', icon: 'syringe', label: 'Vaccinations' },
                    { href: 'mouvements.html', icon: 'refresh', label: 'Mouvements stock' },
                ],
            },
            {
                section: 'Administration',
                items: [
                    { href: 'achats.html',       icon: 'achats',       label: 'Achats' },
                    { href: 'rapports.html',     icon: 'rapports',     label: 'Rapports' },
                    { href: 'utilisateurs.html', icon: 'utilisateurs', label: 'Utilisateurs' },
                    { href: 'parametres.html',   icon: 'parametres',   label: 'Paramètres' },
                    { href: 'veterinaires.html', icon: 'stethoscope', label: 'Vétérinaires' },
                    { href: 'fournisseurs.html', icon: 'fournisseurs', label: 'Fournisseurs' },
                    { href: 'receptions.html', icon: 'truck', label: 'Réceptions' },
                    { href: 'logs.html', icon: 'list', label: 'Logs (Audit)' },
                    { href: 'exports.html', icon: 'download', label: 'Exports' },
                ],
            },
        ];

        const renderLink = (item) => {
            const isActive = item.href.replace('.html', '') === activePage;
            const badge = item.badgeId
                ? `<span class="badge" id="${item.badgeId}" hidden>0</span>`
                : '';

            return `
                <a href="${item.href}" class="sidebar-link${isActive ? ' active' : ''}">
                    <span data-icon="${item.icon}"></span>
                    <span>${item.label}</span>
                    ${badge}
                </a>
            `;
        };

        const renderSection = (group) => `
            <div class="sidebar-section-title">${group.section}</div>
            ${group.items.map(renderLink).join('')}
        `;

        return `
            <div class="sidebar-brand">
                <span class="sidebar-brand-icon">🐾</span>
                <span class="sidebar-brand-text">LGO Pharmacie</span>
            </div>

            <nav class="sidebar-nav">
                ${links.map(renderSection).join('')}
            </nav>

            <div class="sidebar-footer">© 2026 LGO Pharmacie</div>
        `;
    },

    // ============================================================
    // HEADER
    // ============================================================

    /**
     * @param {object} options
     * @param {string} options.title       Titre affiché
     * @param {string} options.breadcrumb  Sous-titre
     * @returns {string} HTML
     */
    header(options = {}) {
        const { title = 'Page', breadcrumb = '' } = options;

        return `
            <div class="header-left">
                <button class="header-toggle" id="sidebarToggle" aria-label="Toggle sidebar">
                    <span data-icon="menu"></span>
                </button>
                <div>
                    <div class="header-title">${title}</div>
                    ${breadcrumb ? `<div class="header-breadcrumb">${breadcrumb}</div>` : ''}
                </div>
            </div>

            <div class="header-user">
                <button class="user-trigger" id="userTrigger">
                    <div class="user-avatar">—</div>
                    <div class="user-info">
                        <div class="user-name">—</div>
                        <div class="user-role">—</div>
                    </div>
                </button>

                <div class="user-dropdown" id="userDropdown">
                    <a href="profil.html" class="dropdown-item">
                        <span data-icon="user"></span>
                        Mon profil
                    </a>
                    <a href="parametres.html" class="dropdown-item">
                        <span data-icon="settings"></span>
                        Paramètres
                    </a>
                    <div class="dropdown-divider"></div>
                    <button class="dropdown-item danger" id="logoutBtn">
                        <span data-icon="logout"></span>
                        Se déconnecter
                    </button>
                </div>
            </div>
        `;
    },

    // ============================================================
    // FOOTER
    // ============================================================

    footer() {
        return `
            <span>© 2026 LGO Pharmacie Vétérinaire — v1.0</span>
            <div class="footer-links">
                <a href="#">Aide</a>
                <a href="#">Confidentialité</a>
                <a href="#">Contact</a>
            </div>
        `;
    },
};