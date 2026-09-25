/**
 * ============================================================
 * LOGIQUE DE LA PAGE MÉDICAMENTS (CRUD COMPLET)
 * ============================================================
 *
 * Cette page gère :
 *   - La liste paginée des médicaments avec filtres (recherche, catégorie, ordonnance, statut)
 *   - La création / modification / suppression (selon le rôle)
 *   - L'activation / désactivation d'un médicament
 *   - Les catégories (liste déroulante alimentée par la base + suggestions)
 *
 * RBAC (Role-Based Access Control) :
 *   - Administrateur : peut créer, modifier, activer/désactiver, supprimer
 *   - Pharmacien     : peut créer, modifier, activer/désactiver (PAS supprimer)
 *   - Vendeur        : lecture seule (le bouton "+ Nouveau" est masqué)
 *
 * ⚠️ Le layout (sidebar, header, footer) est géré par components.js + layout.js.
 *    Ce fichier ne contient QUE la logique du contenu.
 */

// ============================================================
// PROTECTION DE LA PAGE
// ============================================================
Guard.requireAuth();

// ============================================================
// ÉTAT DE LA PAGE
// ============================================================

const State = {
    medicaments: [],
    pagination:  { current_page: 1, last_page: 1, per_page: 20, total: 0 },
    filters: {
        search:         '',
        categorie:      '',
        sur_ordonnance: '',
        actif:          '',
    },
    editingId: null,
};

// ============================================================
// PERMISSIONS (calculées une seule fois au chargement)
// ============================================================

/**
 * Récupère le rôle de l'utilisateur connecté et calcule les permissions.
 * Utilisé dans le rendu du tableau et du bouton "+ Nouveau".
 */
const Permissions = (() => {
    const user = Storage.getUser();
    const role = user?.role || 'Vendeur';

    return {
        role,
        peutCreer:     ['Administrateur', 'Pharmacien'].includes(role),
        peutModifier:  ['Administrateur', 'Pharmacien'].includes(role),
        peutSupprimer: role === 'Administrateur',
        peutVoir:      ['Administrateur', 'Pharmacien', 'Vendeur'].includes(role),
    };
})();

// ============================================================
// INITIALISATION
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Masquer le bouton "+ Nouveau" si l'utilisateur ne peut pas créer
    if (!Permissions.peutCreer) {
        document.getElementById('addBtn')?.style.setProperty('display', 'none');
    }

    // 2. Charger les données
    await loadCategories();
    await loadMedicaments();
    await loadCategoriesForForm();

    // 3. Brancher les événements
    setupEventListeners();
});

// ============================================================
// CHARGEMENT DES DONNÉES
// ============================================================

/**
 * Charge la liste paginée des médicaments avec filtres.
 *
 * @param {number} page  Numéro de page (défaut : 1)
 */
async function loadMedicaments(page = 1) {
    const tbody = document.getElementById('medicamentsTbody');
    tbody.innerHTML = `
        <tr>
            <td colspan="8" class="empty">
                <div class="spinner" style="margin: 20px auto;"></div>
            </td>
        </tr>
    `;

    try {
        const params = new URLSearchParams({
            page,
            per_page: 20,
            with_stock: true,
        });

        // Filtres optionnels
        if (State.filters.search)         params.append('search', State.filters.search);
        if (State.filters.categorie)      params.append('categorie', State.filters.categorie);
        if (State.filters.sur_ordonnance) params.append('sur_ordonnance', State.filters.sur_ordonnance);
        if (State.filters.actif)          params.append('actif', State.filters.actif);

        const response = await Api.get(`/medicaments?${params}`);

        State.medicaments = response.data || [];
        State.pagination  = response.meta || {};

        renderTable();
        renderPagination();
    } catch (error) {
        console.error('[loadMedicaments]', error);

        const msg = error.status
            ? `[${error.status}] ${error.message}`
            : error.message || 'Erreur inconnue';

        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty" style="color: var(--color-danger); padding: 20px; text-align: center;">
                    ⚠️ ${escapeHtml(msg)}
                </td>
            </tr>
        `;

        try { Toast.error(msg); } catch (e) {}
    }
}

/**
 * Charge les catégories dans le <select> du filtre (toolbar).
 */
async function loadCategories() {
    try {
        const response = await Api.get('/medicaments/categories');
        const select = document.getElementById('filterCategorie');

        (response.data || []).forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            select.appendChild(option);
        });
    } catch (e) {
        // Silencieux : pas critique si les catégories ne se chargent pas
    }
}

/**
 * Charge les catégories dans le <select> du modal (création/modification).
 *
 * Combine :
 *   1. Les catégories existantes en base (via API)
 *   2. Une liste de catégories suggérées (au cas où la base serait vide)
 */
async function loadCategoriesForForm() {
    const select = document.getElementById('categorie');
    if (!select) return;

    // Liste fixe de catégories suggérées
    const categoriesSuggerees = [
        'Antibiotique',
        'Antiparasitaire',
        'Anti-inflammatoire',
        'Antalgique',
        'Vaccin',
        'Vitamine',
        'Antiulcéreux',
        'Antiseptique',
        'Corticoïde',
        'Ophtalmologie',
        'Dermatologie',
        'Réhydratation',
        'Matériel',
        'Autre',
    ];

    // Catégories existantes en base
    let categoriesBdd = [];
    try {
        const response = await Api.get('/medicaments/categories');
        categoriesBdd = response.data || [];
    } catch (e) {
        console.warn('[Medicaments] Impossible de charger les catégories BDD');
    }

    // Fusionner + dédupliquer + trier
    const toutes = [...new Set([...categoriesBdd, ...categoriesSuggerees])].sort();

    // Vider sauf la première option
    while (select.options.length > 1) select.remove(1);

    // Ajouter les options
    toutes.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        select.appendChild(opt);
    });
}

// ============================================================
// RENDU DU TABLEAU
// ============================================================

/**
 * Affiche le tableau des médicaments.
 * Les boutons d'action sont filtrés selon le rôle de l'utilisateur.
 */
function renderTable() {
    const tbody = document.getElementById('medicamentsTbody');

    // Cas : aucun médicament
    if (!State.medicaments.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty">
                    <div class="empty-state">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon">
                            <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/>
                            <path d="m8.5 8.5 7 7"/>
                        </svg>
                        <p>Aucun médicament trouvé</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    // Rendu des lignes
    tbody.innerHTML = State.medicaments.map(m => {
        // === Calcul du badge de stock ===
        const stock = m.stock_disponible ?? 0;
        const seuil = m.seuil_alerte ?? 0;
        let stockClass = 'badge-success';
        let stockLabel = stock;

        if (stock === 0) {
            stockClass = 'badge-danger';
            stockLabel = 'Rupture';
        } else if (stock <= seuil) {
            stockClass = 'badge-warning';
        }

        // === Construction des boutons d'action selon le rôle ===
        let actionsHtml = '';

        if (Permissions.peutModifier) {
            actionsHtml += `
                <button class="btn btn-ghost btn-icon" data-action="edit" data-id="${m.id}" title="Modifier">
                    <span data-icon="edit"></span>
                </button>
                <button class="btn btn-ghost btn-icon" data-action="toggle" data-id="${m.id}" title="${m.actif ? 'Désactiver' : 'Activer'}">
                    <span data-icon="power"></span>
                </button>
            `;
        }

        if (Permissions.peutSupprimer) {
            actionsHtml += `
                <button class="btn btn-ghost btn-icon" data-action="delete" data-id="${m.id}" title="Supprimer">
                    <span data-icon="trash"></span>
                </button>
            `;
        }

        // Si aucune action disponible (Vendeur) → tiret
        if (!Permissions.peutModifier && !Permissions.peutSupprimer) {
            actionsHtml = '<span class="text-muted">—</span>';
        }

        // === Ligne HTML ===
        return `
            <tr>
                <td><code>${escapeHtml(m.code_cip)}</code></td>
                <td>
                    <strong>${escapeHtml(m.nom)}</strong>
                    ${m.denomination_commune ? `<br><small class="text-muted">${escapeHtml(m.denomination_commune)}</small>` : ''}
                </td>
                <td>
                    ${m.categorie
                        ? `<span class="badge badge-neutral">${escapeHtml(m.categorie)}</span>`
                        : '—'}
                </td>
                <td class="text-right">
                    <strong>${formatMoney(m.prix_vente_ttc_reference)}</strong>
                </td>
                <td>
                    <span class="badge ${stockClass}">${stockLabel}</span>
                </td>
                <td>
                    ${m.sur_ordonnance
                        ? '<span class="badge badge-warning">Ordonnance</span>'
                        : '<span class="badge badge-neutral">Libre</span>'}
                </td>
                <td>
                    ${m.actif
                        ? '<span class="badge badge-success">Actif</span>'
                        : '<span class="badge badge-neutral">Inactif</span>'}
                </td>
                <td class="text-right">
                    ${actionsHtml}
                </td>
            </tr>
        `;
    }).join('');

    // Réinjecter les icônes SVG
    tbody.querySelectorAll('[data-icon]').forEach(el => {
        const name = el.getAttribute('data-icon');
        if (Icons[name]) el.innerHTML = Icons[name];
    });

    // Attacher les listeners sur les boutons
    attachRowListeners();
}

/**
 * Affiche la pagination sous le tableau.
 */
function renderPagination() {
    const container = document.getElementById('paginationContainer');
    const { current_page, last_page, total } = State.pagination;

    if (!last_page || last_page <= 1) {
        container.innerHTML = total
            ? `<div class="pagination-info">${total} médicament${total > 1 ? 's' : ''}</div>`
            : '';
        return;
    }

    let html = '<div class="pagination">';
    html += `<button ${current_page === 1 ? 'disabled' : ''} onclick="goToPage(${current_page - 1})">‹</button>`;

    for (let i = 1; i <= last_page; i++) {
        if (i === 1 || i === last_page || Math.abs(i - current_page) <= 2) {
            html += `<button class="${i === current_page ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
        } else if (Math.abs(i - current_page) === 3) {
            html += `<button disabled>…</button>`;
        }
    }

    html += `<button ${current_page === last_page ? 'disabled' : ''} onclick="goToPage(${current_page + 1})">›</button>`;
    html += '</div>';
    html += `<div class="pagination-info">${total} médicament${total > 1 ? 's' : ''} — page ${current_page} / ${last_page}</div>`;

    container.innerHTML = html;
}

/**
 * Change de page et recharge les données.
 */
function goToPage(page) {
    loadMedicaments(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================
// ACTIONS (CRUD)
// ============================================================

/**
 * Ouvre le modal en mode "création".
 */
function openCreateModal() {
    // Vérification de permission (sécurité)
    if (!Permissions.peutCreer) {
        Toast.error('Vous n\'avez pas la permission de créer un médicament.');
        return;
    }

    State.editingId = null;
    document.getElementById('modalTitle').textContent = 'Nouveau médicament';
    document.getElementById('submitBtnText').textContent = 'Créer';
    document.getElementById('medicamentForm').reset();
    document.getElementById('actif').checked = true;
    clearFormErrors();
    document.getElementById('medicamentModal').classList.add('open');
}

/**
 * Ouvre le modal en mode "modification" avec les données pré-remplies.
 *
 * @param {number} id  ID du médicament à modifier
 */
function editMedicament(id) {
    // Vérification de permission (sécurité)
    if (!Permissions.peutModifier) {
        Toast.error('Vous n\'avez pas la permission de modifier un médicament.');
        return;
    }

    const m = State.medicaments.find(x => x.id === id);
    if (!m) return;

    State.editingId = id;
    document.getElementById('modalTitle').textContent = 'Modifier le médicament';
    document.getElementById('submitBtnText').textContent = 'Enregistrer';

    // Pré-remplir les champs
    document.getElementById('medicamentId').value            = m.id;
    document.getElementById('codeCip').value                 = m.code_cip || '';
    document.getElementById('codeBarre').value               = m.code_barre || '';
    document.getElementById('nom').value                     = m.nom || '';
    document.getElementById('denominationCommune').value     = m.denomination_commune || '';
    document.getElementById('laboratoire').value             = m.laboratoire || '';
    document.getElementById('forme').value                   = m.forme || '';
    document.getElementById('dosage').value                  = m.dosage || '';
    document.getElementById('voieAdministration').value      = m.voie_administration || '';
    document.getElementById('prixVente').value               = m.prix_vente_ttc_reference || '';
    document.getElementById('tauxTva').value                 = m.taux_tva || 0;
    document.getElementById('seuilAlerte').value             = m.seuil_alerte || 10;
    document.getElementById('stockMax').value                = m.stock_max || '';
    document.getElementById('delaiAttente').value            = m.delai_attente || '';
    document.getElementById('posologie').value               = m.posologie || '';
    document.getElementById('surOrdonnance').checked         = !!m.sur_ordonnance;
    document.getElementById('usagePreventif').checked        = !!m.usage_preventif;
    document.getElementById('actif').checked                 = !!m.actif;

    // Gérer le <select> catégorie (ajouter l'option si elle n'existe pas)
    const categorieSelect = document.getElementById('categorie');
    if (m.categorie && ![...categorieSelect.options].some(o => o.value === m.categorie)) {
        const opt = document.createElement('option');
        opt.value = m.categorie;
        opt.textContent = m.categorie;
        categorieSelect.appendChild(opt);
    }
    categorieSelect.value = m.categorie || '';

    clearFormErrors();
    document.getElementById('medicamentModal').classList.add('open');
}

/**
 * Active ou désactive un médicament.
 */
async function toggleActif(id) {
    if (!Permissions.peutModifier) {
        Toast.error('Vous n\'avez pas la permission de modifier le statut.');
        return;
    }

    try {
        const response = await Api.post(`/medicaments/${id}/toggle-actif`);
        Toast.success(response.message);
        await loadMedicaments(State.pagination.current_page || 1);
    } catch (error) {
        Toast.error(error.message);
    }
}

/**
 * Supprime (soft delete) un médicament après confirmation.
 */
function deleteMedicament(id) {
    if (!Permissions.peutSupprimer) {
        Toast.error('Vous n\'avez pas la permission de supprimer un médicament.');
        return;
    }

    const m = State.medicaments.find(x => x.id === id);
    if (!m) return;

    showConfirm(
        `Voulez-vous vraiment supprimer <strong>${escapeHtml(m.nom)}</strong> ?<br>
         <small>Le médicament sera marqué comme supprimé (soft delete).</small>`,
        async () => {
            try {
                const response = await Api.delete(`/medicaments/${id}`);
                Toast.success(response.message || 'Médicament supprimé.');
                await loadMedicaments(State.pagination.current_page || 1);
            } catch (error) {
                Toast.error(error.message);
            }
        }
    );
}

// ============================================================
// SOUMISSION DU FORMULAIRE
// ============================================================

/**
 * Gère la soumission du formulaire (création OU modification).
 */
async function submitMedicamentForm(e) {
    e.preventDefault();
    clearFormErrors();

    const btn = document.getElementById('modalSubmitBtn');
    const originalText = document.getElementById('submitBtnText').textContent;

    btn.disabled = true;
    document.getElementById('submitBtnText').textContent = 'Enregistrement...';

    // Construire le payload
    const data = {
        code_cip:                 document.getElementById('codeCip').value.trim(),
        code_barre:               document.getElementById('codeBarre').value.trim() || null,
        nom:                      document.getElementById('nom').value.trim(),
        denomination_commune:     document.getElementById('denominationCommune').value.trim() || null,
        laboratoire:              document.getElementById('laboratoire').value.trim() || null,
        forme:                    document.getElementById('forme').value.trim() || null,
        dosage:                   document.getElementById('dosage').value.trim() || null,
        categorie:                document.getElementById('categorie').value || null,
        voie_administration:      document.getElementById('voieAdministration').value.trim() || null,
        prix_vente_ttc_reference: parseFloat(document.getElementById('prixVente').value) || 0,
        taux_tva:                 parseFloat(document.getElementById('tauxTva').value) || 0,
        seuil_alerte:             parseInt(document.getElementById('seuilAlerte').value) || 0,
        stock_max:                parseInt(document.getElementById('stockMax').value) || null,
        delai_attente:            document.getElementById('delaiAttente').value.trim() || null,
        posologie:                document.getElementById('posologie').value.trim() || null,
        sur_ordonnance:           document.getElementById('surOrdonnance').checked,
        usage_preventif:          document.getElementById('usagePreventif').checked,
        actif:                    document.getElementById('actif').checked,
    };

    try {
        let response;
        if (State.editingId) {
            response = await Api.put(`/medicaments/${State.editingId}`, data);
        } else {
            response = await Api.post('/medicaments', data);
        }

        Toast.success(response.message);
        closeModal('medicamentModal');
        await loadMedicaments(State.pagination.current_page || 1);
    } catch (error) {
        if (error.errors) {
            // Erreurs de validation par champ
            Object.entries(error.errors).forEach(([field, messages]) => {
                showFieldError(field, messages[0]);
            });
        } else {
            Toast.error(error.message);
        }
    } finally {
        btn.disabled = false;
        document.getElementById('submitBtnText').textContent = originalText;
    }
}

// ============================================================
// MODALS
// ============================================================

/**
 * Ferme un modal par son ID.
 */
function closeModal(id) {
    document.getElementById(id).classList.remove('open');
}

let confirmCallback = null;

/**
 * Affiche un modal de confirmation.
 *
 * @param {string}   message
 * @param {Function} callback  Fonction à exécuter si l'utilisateur confirme
 */
function showConfirm(message, callback) {
    document.getElementById('confirmMessage').innerHTML = message;
    confirmCallback = callback;
    document.getElementById('confirmModal').classList.add('open');
}

// ============================================================
// LISTENERS
// ============================================================

/**
 * Branche les événements sur les boutons et les filtres.
 */
function setupEventListeners() {
    // Bouton "+ Nouveau" (si visible)
    const addBtn = document.getElementById('addBtn');
    if (addBtn) addBtn.addEventListener('click', openCreateModal);

    // Fermeture des modals
    document.getElementById('modalCloseBtn')?.addEventListener('click', () => closeModal('medicamentModal'));
    document.getElementById('modalCancelBtn')?.addEventListener('click', () => closeModal('medicamentModal'));
    document.getElementById('confirmCloseBtn')?.addEventListener('click', () => closeModal('confirmModal'));
    document.getElementById('confirmCancelBtn')?.addEventListener('click', () => closeModal('confirmModal'));

    // Confirmation de suppression
    document.getElementById('confirmOkBtn')?.addEventListener('click', async () => {
        if (confirmCallback) await confirmCallback();
        closeModal('confirmModal');
        confirmCallback = null;
    });

    // Soumission du formulaire
    document.getElementById('medicamentForm')?.addEventListener('submit', submitMedicamentForm);

    // Filtre : recherche (avec debounce de 400ms)
    let searchTimeout;
    document.getElementById('searchInput')?.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            State.filters.search = e.target.value.trim();
            loadMedicaments(1);
        }, 400);
    });

    // Filtres déroulants
    document.getElementById('filterCategorie')?.addEventListener('change', (e) => {
        State.filters.categorie = e.target.value;
        loadMedicaments(1);
    });

    document.getElementById('filterOrdonnance')?.addEventListener('change', (e) => {
        State.filters.sur_ordonnance = e.target.value;
        loadMedicaments(1);
    });

    document.getElementById('filterActif')?.addEventListener('change', (e) => {
        State.filters.actif = e.target.value;
        loadMedicaments(1);
    });

    // Réinitialisation des filtres
    document.getElementById('resetFiltersBtn')?.addEventListener('click', () => {
        State.filters = { search: '', categorie: '', sur_ordonnance: '', actif: '' };
        document.getElementById('searchInput').value = '';
        document.getElementById('filterCategorie').value = '';
        document.getElementById('filterOrdonnance').value = '';
        document.getElementById('filterActif').value = '';
        loadMedicaments(1);
    });

    // Fermer un modal si clic sur l'overlay
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.classList.remove('open');
        });
    });
}

// ============================================================
// DÉLÉGATION D'ÉVÉNEMENTS SUR LE TABLEAU
// ============================================================

/**
 * Attache les listeners sur les boutons d'action du tableau.
 * Utilise la délégation d'événement (un seul listener sur le tbody).
 */
function attachRowListeners() {
    const tbody = document.getElementById('medicamentsTbody');
    tbody.removeEventListener('click', handleRowClick);
    tbody.addEventListener('click', handleRowClick);
}

/**
 * Gère les clics sur les boutons d'action (edit / toggle / delete).
 */
function handleRowClick(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.getAttribute('data-action');
    const id     = parseInt(btn.getAttribute('data-id'), 10);
    if (!id) return;

    switch (action) {
        case 'edit':   editMedicament(id); break;
        case 'toggle': toggleActif(id); break;
        case 'delete': deleteMedicament(id); break;
    }
}

// ============================================================
// HELPERS
// ============================================================

/**
 * Affiche une erreur sous un champ.
 */
function showFieldError(field, message) {
    const el = document.querySelector(`[data-error-for="${field}"]`);
    if (el) el.textContent = message;

    const input = document.getElementById(fieldToInputId(field));
    if (input) input.classList.add('error');
}

/**
 * Efface toutes les erreurs du formulaire.
 */
function clearFormErrors() {
    document.querySelectorAll('.field-error').forEach(el => el.textContent = '');
    document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
}

/**
 * Convertit un nom de champ API en ID d'input HTML.
 */
function fieldToInputId(field) {
    const map = {
        code_cip: 'codeCip',
        code_barre: 'codeBarre',
        nom: 'nom',
        prix_vente_ttc_reference: 'prixVente',
    };
    return map[field] || field;
}

/**
 * Formate un montant en BIF.
 */
function formatMoney(value) {
    return new Intl.NumberFormat('fr-BI', {
        style: 'currency',
        currency: 'BIF',
        minimumFractionDigits: 0,
    }).format(value || 0);
}

/**
 * Échappe le HTML pour éviter les injections XSS.
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}