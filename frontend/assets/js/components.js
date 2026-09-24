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
        /**
     * Génère la sidebar en filtrant les liens selon le rôle.
     *
     * @param {string} activePage  Nom de la page active (sans .html)
     * @returns {string} HTML
     */
    sidebar(activePage = '') {
        // ⚠️ Récupérer le rôle de l'utilisateur connecté
        const user = typeof Storage !== 'undefined' ? Storage.getUser() : null;
        const userRole = user?.role || null;

        // ═══════════════════════════════════════════════════════════
        // DÉFINITION DES LIENS avec 'roles' = qui peut les voir
        // ═══════════════════════════════════════════════════════════
        const links = [
            {
                section: 'Principal',
                items: [
                    {
                        href: 'dashboard.html',
                        icon: 'dashboard',
                        label: 'Tableau de bord',
                        roles: ['Administrateur', 'Pharmacien', 'Vendeur'],
                    },
                    {
                        href: 'caisse.html',
                        icon: 'caisse',
                        label: 'Caisse',
                        roles: ['Administrateur', 'Pharmacien', 'Vendeur'],
                    },
                    {
                        href: 'ventes.html',
                        icon: 'ventes',
                        label: 'Ventes',
                        roles: ['Administrateur', 'Pharmacien', 'Vendeur'],
                    },
                ],
            },
            {
                section: 'Gestion',
                items: [
                    {
                        href: 'medicaments.html',
                        icon: 'medicaments',
                        label: 'Médicaments',
                        roles: ['Administrateur', 'Pharmacien', 'Vendeur'],
                    },
                    {
                        href: 'lots.html',
                        icon: 'lots',
                        label: 'Lots & Stock',
                        badgeId: 'badgeAlertes',
                        roles: ['Administrateur', 'Pharmacien'],
                    },
                    {
                        href: 'especes.html',
                        icon: 'especes',
                        label: 'Espèces',
                        roles: ['Administrateur', 'Pharmacien', 'Vendeur'],
                    },
                    {
                        href: 'animaux.html',
                        icon: 'animaux',
                        label: 'Animaux',
                        roles: ['Administrateur', 'Pharmacien', 'Vendeur'],
                    },
                    {
                        href: 'proprietaires.html',
                        icon: 'proprietaires',
                        label: 'Propriétaires',
                        roles: ['Administrateur', 'Pharmacien', 'Vendeur'],
                    },
                    {
                        href: 'ordonnances.html',
                        icon: 'fileText',
                        label: 'Ordonnances',
                        roles: ['Administrateur', 'Pharmacien', 'Vendeur'],
                    },
                    {
                        href: 'vaccinations.html',
                        icon: 'syringe',
                        label: 'Vaccinations',
                        roles: ['Administrateur', 'Pharmacien', 'Vendeur'],
                    },
                ],
            },
            {
                section: 'Approvisionnement',
                items: [
                    {
                        href: 'fournisseurs.html',
                        icon: 'fournisseurs',
                        label: 'Fournisseurs',
                        roles: ['Administrateur', 'Pharmacien'],
                    },
                    {
                        href: 'achats.html',
                        icon: 'achats',
                        label: 'Achats',
                        roles: ['Administrateur', 'Pharmacien'],
                    },
                    {
                        href: 'receptions.html',
                        icon: 'truck',
                        label: 'Réceptions',
                        roles: ['Administrateur', 'Pharmacien'],
                    },
                ],
            },
            {
                section: 'Partenaires',
                items: [
                    {
                        href: 'veterinaires.html',
                        icon: 'stethoscope',
                        label: 'Vétérinaires',
                        roles: ['Administrateur', 'Pharmacien', 'Vendeur'],
                    },
                ],
            },
            {
                section: 'Analyse',
                items: [
                    {
                        href: 'rapports.html',
                        icon: 'rapports',
                        label: 'Rapports',
                        roles: ['Administrateur', 'Pharmacien'],
                    },
                    {
                        href: 'mouvements.html',
                        icon: 'refresh',
                        label: 'Mouvements stock',
                        roles: ['Administrateur', 'Pharmacien'],
                    },
                    {
                        href: 'exports.html',
                        icon: 'download',
                        label: 'Exports',
                        roles: ['Administrateur', 'Pharmacien'],
                    },
                ],
            },
            {
                section: 'Administration',
                items: [
                    {
                        href: 'utilisateurs.html',
                        icon: 'utilisateurs',
                        label: 'Utilisateurs',
                        roles: ['Administrateur'],
                    },
                    {
                        href: 'logs.html',
                        icon: 'list',
                        label: 'Logs (Audit)',
                        roles: ['Administrateur'],
                    },
                    {
                        href: 'parametres.html',
                        icon: 'parametres',
                        label: 'Paramètres',
                        roles: ['Administrateur', 'Pharmacien'],   // lecture seule pour pharmacien
                    },
                ],
            },
        ];

        // ═══════════════════════════════════════════════════════════
        // FILTRAGE selon le rôle
        // ═══════════════════════════════════════════════════════════
        const filteredLinks = links
            .map(group => ({
                ...group,
                items: group.items.filter(item => {
                    // Si pas de rôle défini → accessible à tous
                    if (!item.roles) return true;
                    // Si aucun utilisateur → masquer (sécurité)
                    if (!userRole) return false;
                    // Sinon vérifier si le rôle est dans la liste
                    return item.roles.includes(userRole);
                }),
            }))
            // Supprimer les groupes qui n'ont plus d'items
            .filter(group => group.items.length > 0);

        // ═══════════════════════════════════════════════════════════
        // RENDU
        // ═══════════════════════════════════════════════════════════
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
                ${filteredLinks.map(renderSection).join('')}
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

                    <!-- ⚠️ Toggle de thème DANS le menu -->
                    <button class="dropdown-item" id="themeToggle" type="button">
                        <span data-icon="moon"></span>
                        <span class="theme-label">Thème sombre</span>
                    </button>

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