/**
 * Logique de la page Propriétaires (CRUD complet).
 *
 * Le layout (sidebar, header, footer) est injecté par components.js + layout.js.
 * Ce fichier ne contient QUE la logique de la page.
 */

// === 1. Protéger la page ===
Guard.requireAuth();

// === 2. État ===
const State = {
    proprietaires: [],
    pagination: { current_page: 1, last_page: 1, per_page: 20, total: 0 },
    filters: {
        search: '',
        type:   '',
        ville:  '',
    },
    editingId: null,
};

// === 3. Init ===
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadVilles();
    } catch (e) {
        console.warn('[Proprietaires] loadVilles a échoué (non bloquant)', e);
    }

    try {
        await loadProprietaires();
    } catch (error) {
        console.error('[Proprietaires] Erreur init:', error);
    }

    setupEventListeners();
});

// ============================================================
// CHARGEMENT
// ============================================================

async function loadProprietaires(page = 1) {
    const tbody = document.getElementById('proprietairesTbody');
    tbody.innerHTML = `<tr><td colspan="6" class="empty"><div class="spinner" style="margin:20px auto;"></div></td></tr>`;

    try {
        const params = new URLSearchParams({ page, per_page: 20, with_stats: 1 });

        if (State.filters.search) params.append('search', State.filters.search);
        if (State.filters.type)   params.append('type', State.filters.type);
        if (State.filters.ville)  params.append('ville', State.filters.ville);

        const response = await Api.get(`/proprietaires?${params}`);

        State.proprietaires = response.data || [];
        State.pagination = response.meta || {};

        renderTable();
        renderPagination();
    } catch (error) {
        const msg = error.status
            ? `[${error.status}] ${error.message}`
            : error.message;

        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty" style="color: var(--color-danger); padding: 20px; text-align: center;">
                    ⚠️ ${escapeHtml(msg)}
                </td>
            </tr>
        `;
        try { Toast.error(msg); } catch (e) {}
    }
}

async function loadVilles() {
    try {
        const response = await Api.get('/proprietaires/villes');
        const select = document.getElementById('filterVille');
        if (!select) return;

        (response.data || []).forEach(ville => {
            const option = document.createElement('option');
            option.value = ville;
            option.textContent = ville;
            select.appendChild(option);
        });
    } catch (e) {
        // Silencieux
    }
}

// ============================================================
// RENDU
// ============================================================

function renderTable() {
    const tbody = document.getElementById('proprietairesTbody');

    if (!State.proprietaires.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty">
                    <div class="empty-state">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                        <p>Aucun propriétaire trouvé</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    const typeLabels = {
        particulier: { label: 'Particulier', class: 'badge-info' },
        ferme:       { label: 'Ferme',       class: 'badge-warning' },
        clinique:    { label: 'Clinique',    class: 'badge-success' },
        societe:     { label: 'Société',     class: 'badge-primary' },
    };

    tbody.innerHTML = State.proprietaires.map(p => {
        const t = typeLabels[p.type] || { label: p.type, class: 'badge-neutral' };
        const nom = p.nom_complet || `${p.prenom || ''} ${p.nom}`.trim();
        const nbAnimaux = p.nb_animaux ?? '—';

        return `
            <tr>
                <td>
                    <strong>${escapeHtml(nom)}</strong>
                    ${p.raison_sociale ? `<br><small class="text-muted">${escapeHtml(p.raison_sociale)}</small>` : ''}
                </td>
                <td><span class="badge ${t.class}">${escapeHtml(t.label)}</span></td>
                <td>
                    ${p.telephone ? `<div>📞 ${escapeHtml(p.telephone)}</div>` : ''}
                    ${p.email ? `<small class="text-muted">✉ ${escapeHtml(p.email)}</small>` : ''}
                    ${!p.telephone && !p.email ? '<span class="text-muted">—</span>' : ''}
                </td>
                <td>
                    ${p.ville ? escapeHtml(p.ville) : '<span class="text-muted">—</span>'}
                </td>
                <td>
                    ${p.animaux && p.animaux.length
                        ? p.animaux.map(a =>
                            `<span class="badge badge-info" style="margin-right: 4px;">
                                ${escapeHtml(a.nom || 'Animal')}${a.espece ? ' (' + escapeHtml(a.espece) + ')' : ''}
                            </span>`
                        ).join('')
                        : '<span class="text-muted">—</span>'}
                </td>
                <td class="text-right">
                    <button class="btn btn-ghost btn-icon" data-action="edit" data-id="${p.id}" title="Modifier">
                        <span data-icon="edit"></span>
                    </button>
                    <button class="btn btn-ghost btn-icon" data-action="delete" data-id="${p.id}" title="Supprimer">
                        <span data-icon="trash"></span>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    // Réinjecter les icônes
    tbody.querySelectorAll('[data-icon]').forEach(el => {
        const name = el.getAttribute('data-icon');
        if (Icons[name]) el.innerHTML = Icons[name];
    });

    attachRowListeners();
}

function attachRowListeners() {
    const tbody = document.getElementById('proprietairesTbody');
    tbody.removeEventListener('click', handleRowClick);
    tbody.addEventListener('click', handleRowClick);
}

function handleRowClick(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.getAttribute('data-action');
    const id     = parseInt(btn.getAttribute('data-id'), 10);
    if (!id) return;

    switch (action) {
        case 'edit':   editProprietaire(id); break;
        case 'delete': deleteProprietaire(id); break;
    }
}

function renderPagination() {
    const container = document.getElementById('paginationContainer');
    const { current_page, last_page, total } = State.pagination;

    if (!last_page || last_page <= 1) {
        container.innerHTML = total
            ? `<div class="pagination-info">${total} propriétaire${total > 1 ? 's' : ''}</div>`
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
    html += `<div class="pagination-info">${total} propriétaire${total > 1 ? 's' : ''} — page ${current_page} / ${last_page}</div>`;

    container.innerHTML = html;
}

function goToPage(page) {
    loadProprietaires(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================
// ACTIONS
// ============================================================

function openCreateModal() {
    State.editingId = null;
    document.getElementById('modalTitle').textContent = 'Nouveau propriétaire';
    document.getElementById('submitBtnText').textContent = 'Créer';
    document.getElementById('proprietaireForm').reset();
    document.getElementById('pays').value = 'Burundi';
    clearFormErrors();
    toggleTypeFields(); // ajuste l'affichage des champs selon le type
    document.getElementById('proprietaireModal').classList.add('open');
}

function editProprietaire(id) {
    const p = State.proprietaires.find(x => x.id === id);
    if (!p) return;

    State.editingId = id;
    document.getElementById('modalTitle').textContent = 'Modifier le propriétaire';
    document.getElementById('submitBtnText').textContent = 'Enregistrer';

    document.getElementById('proprietaireId').value = p.id;
    document.getElementById('type').value = p.type || '';
    document.getElementById('nom').value = p.nom || '';
    document.getElementById('prenom').value = p.prenom || '';
    document.getElementById('raisonSociale').value = p.raison_sociale || '';
    document.getElementById('dateNaissance').value = p.date_naissance || '';
    document.getElementById('sexe').value = p.sexe || '';
    document.getElementById('telephone').value = p.telephone || '';
    document.getElementById('email').value = p.email || '';
    document.getElementById('adresse').value = p.adresse || '';
    document.getElementById('ville').value = p.ville || '';
    document.getElementById('province').value = p.province || '';
    document.getElementById('pays').value = p.pays || 'Burundi';
    document.getElementById('numeroPieceIdentite').value = p.numero_piece_identite || '';
    document.getElementById('numeroContribuable').value = p.numero_contribuable || '';
    document.getElementById('notes').value = p.notes || '';
    document.getElementById('consentementRgpd').checked = !!p.consentement_rgpd;

    clearFormErrors();
    toggleTypeFields();
    document.getElementById('proprietaireModal').classList.add('open');
}

function deleteProprietaire(id) {
    const p = State.proprietaires.find(x => x.id === id);
    if (!p) return;

    const nom = p.nom_complet || `${p.prenom || ''} ${p.nom}`.trim();

    showConfirm(
        `Voulez-vous vraiment supprimer <strong>${escapeHtml(nom)}</strong> ?<br><small>Le propriétaire sera marqué comme supprimé (soft delete).</small>`,
        async () => {
            try {
                const response = await Api.delete(`/proprietaires/${id}`);
                Toast.success(response.message || 'Propriétaire supprimé.');
                await loadProprietaires(State.pagination.current_page || 1);
            } catch (error) {
                Toast.error(error.message);
            }
        }
    );
}

// ============================================================
// AFFICHAGE CONDITIONNEL DES CHAMPS SELON LE TYPE
// ============================================================

function toggleTypeFields() {
    const type = document.getElementById('type').value;

    const isParticulier = type === 'particulier' || type === '';
    const isStructure   = ['ferme', 'clinique', 'societe'].includes(type);

    // Prénom : visible seulement pour particulier
    document.getElementById('prenomField').style.display = isParticulier ? '' : 'none';

    // Date naissance + sexe : seulement pour particulier
    document.getElementById('dateNaissanceField').style.display = isParticulier ? '' : 'none';
    document.getElementById('sexeField').style.display           = isParticulier ? '' : 'none';

    // Raison sociale : visible seulement pour structure
    document.getElementById('raisonSocialeField').style.display = isStructure ? '' : 'none';
}

// ============================================================
// FORMULAIRE
// ============================================================

async function submitProprietaireForm(e) {
    e.preventDefault();
    clearFormErrors();

    const btn = document.getElementById('modalSubmitBtn');
    const originalText = document.getElementById('submitBtnText').textContent;
    btn.disabled = true;
    document.getElementById('submitBtnText').textContent = 'Enregistrement...';

    const type = document.getElementById('type').value;
    const isParticulier = type === 'particulier';

    const data = {
        type,
        nom:                    document.getElementById('nom').value.trim(),
        prenom:                 isParticulier ? (document.getElementById('prenom').value.trim() || null) : null,
        raison_sociale:         isParticulier ? null : (document.getElementById('raisonSociale').value.trim() || null),
        date_naissance:         isParticulier ? (document.getElementById('dateNaissance').value || null) : null,
        sexe:                   isParticulier ? (document.getElementById('sexe').value || null) : null,
        telephone:              document.getElementById('telephone').value.trim() || null,
        email:                  document.getElementById('email').value.trim() || null,
        adresse:                document.getElementById('adresse').value.trim() || null,
        ville:                  document.getElementById('ville').value.trim() || null,
        province:               document.getElementById('province').value.trim() || null,
        pays:                   document.getElementById('pays').value.trim() || null,
        numero_piece_identite:  document.getElementById('numeroPieceIdentite').value.trim() || null,
        numero_contribuable:    document.getElementById('numeroContribuable').value.trim() || null,
        notes:                  document.getElementById('notes').value.trim() || null,
        consentement_rgpd:      document.getElementById('consentementRgpd').checked,
    };

    try {
        let response;
        if (State.editingId) {
            response = await Api.put(`/proprietaires/${State.editingId}`, data);
        } else {
            response = await Api.post('/proprietaires', data);
        }

        Toast.success(response.message);
        closeModal('proprietaireModal');
        await loadProprietaires(State.pagination.current_page || 1);
        await refreshVilles();
    } catch (error) {
        if (error.errors) {
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

async function refreshVilles() {
    const select = document.getElementById('filterVille');
    if (!select) return;

    const current = select.value;
    while (select.options.length > 1) select.remove(1);

    try {
        const response = await Api.get('/proprietaires/villes');
        (response.data || []).forEach(ville => {
            const option = document.createElement('option');
            option.value = ville;
            option.textContent = ville;
            select.appendChild(option);
        });
        if (current) select.value = current;
    } catch (e) { /* Silencieux */ }
}

// ============================================================
// MODALS
// ============================================================

function closeModal(id) {
    document.getElementById(id).classList.remove('open');
}

let confirmCallback = null;

function showConfirm(message, callback) {
    document.getElementById('confirmMessage').innerHTML = message;
    confirmCallback = callback;
    document.getElementById('confirmModal').classList.add('open');
}

// ============================================================
// EVENT LISTENERS
// ============================================================

function setupEventListeners() {
    const safe = (id, event, fn) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener(event, fn);
    };

    safe('addBtn', 'click', openCreateModal);

    safe('modalCloseBtn', 'click', () => closeModal('proprietaireModal'));
    safe('modalCancelBtn', 'click', () => closeModal('proprietaireModal'));
    safe('confirmCloseBtn', 'click', () => closeModal('confirmModal'));
    safe('confirmCancelBtn', 'click', () => closeModal('confirmModal'));

    safe('confirmOkBtn', 'click', async () => {
        if (confirmCallback) await confirmCallback();
        closeModal('confirmModal');
        confirmCallback = null;
    });

    safe('proprietaireForm', 'submit', submitProprietaireForm);

    // Changement de type → ajuste les champs visibles
    safe('type', 'change', toggleTypeFields);

    // Filtres
    let searchTimeout;
    safe('searchInput', 'input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            State.filters.search = e.target.value.trim();
            loadProprietaires(1);
        }, 400);
    });

    safe('filterType', 'change', (e) => {
        State.filters.type = e.target.value;
        loadProprietaires(1);
    });

    safe('filterVille', 'change', (e) => {
        State.filters.ville = e.target.value;
        loadProprietaires(1);
    });

    safe('resetFiltersBtn', 'click', () => {
        State.filters = { search: '', type: '', ville: '' };
        document.getElementById('searchInput').value = '';
        document.getElementById('filterType').value = '';
        document.getElementById('filterVille').value = '';
        loadProprietaires(1);
    });

    // Fermer modal si clic sur overlay
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.classList.remove('open');
        });
    });
}

// ============================================================
// HELPERS
// ============================================================

function showFieldError(field, message) {
    const el = document.querySelector(`[data-error-for="${field}"]`);
    if (el) el.textContent = message;

    const input = document.getElementById(fieldToInputId(field));
    if (input) input.classList.add('error');
}

function clearFormErrors() {
    document.querySelectorAll('.field-error').forEach(el => el.textContent = '');
    document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
}

function fieldToInputId(field) {
    const map = {
        type: 'type',
        nom: 'nom',
        prenom: 'prenom',
        raison_sociale: 'raisonSociale',
        date_naissance: 'dateNaissance',
        sexe: 'sexe',
        telephone: 'telephone',
        email: 'email',
        adresse: 'adresse',
        ville: 'ville',
        province: 'province',
        pays: 'pays',
        numero_piece_identite: 'numeroPieceIdentite',
        numero_contribuable: 'numeroContribuable',
        notes: 'notes',
    };
    return map[field] || field;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}