/**
 * Logique de la page Fournisseurs (CRUD complet).
 *
 * Le layout (sidebar, header, footer) est injecté par components.js + layout.js.
 * Ce fichier ne contient QUE la logique de la page.
 */

// === 1. Protéger la page ===
Guard.requireAuth();

// === 2. État ===
const State = {
    fournisseurs: [],
    pagination: { current_page: 1, last_page: 1, per_page: 20, total: 0 },
    filters: {
        search: '',
        ville:  '',
        actif:  '',
    },
    editingId: null,
};

// === 3. Init ===
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadVilles();
    } catch (e) {
        console.warn('[Fournisseurs] loadVilles a échoué (non bloquant)', e);
    }

    try {
        await loadFournisseurs();
    } catch (error) {
        console.error('[Fournisseurs] Erreur init:', error);
    }

    setupEventListeners();
});

// ============================================================
// CHARGEMENT
// ============================================================

async function loadFournisseurs(page = 1) {
    const tbody = document.getElementById('fournisseursTbody');
    tbody.innerHTML = `<tr><td colspan="7" class="empty"><div class="spinner" style="margin:20px auto;"></div></td></tr>`;

    try {
        const params = new URLSearchParams({ page, per_page: 20 });

        if (State.filters.search) params.append('search', State.filters.search);
        if (State.filters.ville)  params.append('ville', State.filters.ville);
        if (State.filters.actif)  params.append('actif', State.filters.actif);

        const response = await Api.get(`/fournisseurs?${params}`);

        State.fournisseurs = response.data || [];
        State.pagination = response.meta || {};

        renderTable();
        renderPagination();
    } catch (error) {
        const msg = error.status
            ? `[${error.status}] ${error.message}`
            : error.message;

        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty" style="color: var(--color-danger); padding: 20px; text-align: center;">
                    ⚠️ ${escapeHtml(msg)}
                </td>
            </tr>
        `;
        try { Toast.error(msg); } catch (e) {}
    }
}

async function loadVilles() {
    try {
        const response = await Api.get('/fournisseurs/villes');
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
    const tbody = document.getElementById('fournisseursTbody');

    if (!State.fournisseurs.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty">
                    <div class="empty-state">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                        <p>Aucun fournisseur trouvé</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = State.fournisseurs.map(f => `
        <tr>
            <td>
                <strong>${escapeHtml(f.nom)}</strong>
                ${f.raison_sociale ? `<br><small class="text-muted">${escapeHtml(f.raison_sociale)}</small>` : ''}
            </td>
            <td>
                ${f.telephone ? `<div>📞 ${escapeHtml(f.telephone)}</div>` : ''}
                ${f.email ? `<small class="text-muted">✉ ${escapeHtml(f.email)}</small>` : ''}
                ${!f.telephone && !f.email ? '<span class="text-muted">—</span>' : ''}
            </td>
            <td>
                ${f.adresse || f.ville
                    ? `<span class="text-muted truncate">${escapeHtml(f.adresse || f.ville)}</span>`
                    : '<span class="text-muted">—</span>'}
            </td>
            <td>
                ${f.pays ? `<span class="badge badge-neutral">${escapeHtml(f.pays)}</span>` : '—'}
            </td>
            <td>
                ${f.delai_livraison_jours
                    ? `${f.delai_livraison_jours} j`
                    : '<span class="text-muted">—</span>'}
            </td>
            <td>
                ${f.actif
                    ? '<span class="badge badge-success">Actif</span>'
                    : '<span class="badge badge-neutral">Inactif</span>'}
            </td>
            <td class="text-right">
                <button class="btn btn-ghost btn-icon" data-action="edit" data-id="${f.id}" title="Modifier">
                    <span data-icon="edit"></span>
                </button>
                <button class="btn btn-ghost btn-icon" data-action="toggle" data-id="${f.id}" title="${f.actif ? 'Désactiver' : 'Activer'}">
                    <span data-icon="power"></span>
                </button>
                <button class="btn btn-ghost btn-icon" data-action="delete" data-id="${f.id}" title="Supprimer">
                    <span data-icon="trash"></span>
                </button>
            </td>
        </tr>
    `).join('');

    // Réinjecter les icônes
    tbody.querySelectorAll('[data-icon]').forEach(el => {
        const name = el.getAttribute('data-icon');
        if (Icons[name]) el.innerHTML = Icons[name];
    });

    attachRowListeners();
}

function attachRowListeners() {
    const tbody = document.getElementById('fournisseursTbody');
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
        case 'edit':   editFournisseur(id); break;
        case 'toggle': toggleActif(id); break;
        case 'delete': deleteFournisseur(id); break;
    }
}

function renderPagination() {
    const container = document.getElementById('paginationContainer');
    const { current_page, last_page, total } = State.pagination;

    if (!last_page || last_page <= 1) {
        container.innerHTML = total
            ? `<div class="pagination-info">${total} fournisseur${total > 1 ? 's' : ''}</div>`
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
    html += `<div class="pagination-info">${total} fournisseur${total > 1 ? 's' : ''} — page ${current_page} / ${last_page}</div>`;

    container.innerHTML = html;
}

function goToPage(page) {
    loadFournisseurs(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================
// ACTIONS
// ============================================================

function openCreateModal() {
    State.editingId = null;
    document.getElementById('modalTitle').textContent = 'Nouveau fournisseur';
    document.getElementById('submitBtnText').textContent = 'Créer';
    document.getElementById('fournisseurForm').reset();
    document.getElementById('actif').checked = true;
    document.getElementById('pays').value = 'Burundi'; // valeur par défaut
    clearFormErrors();
    document.getElementById('fournisseurModal').classList.add('open');
}

function editFournisseur(id) {
    const f = State.fournisseurs.find(x => x.id === id);
    if (!f) return;

    State.editingId = id;
    document.getElementById('modalTitle').textContent = 'Modifier le fournisseur';
    document.getElementById('submitBtnText').textContent = 'Enregistrer';

    document.getElementById('fournisseurId').value = f.id;
    document.getElementById('nom').value = f.nom || '';
    document.getElementById('raisonSociale').value = f.raison_sociale || '';
    document.getElementById('numeroContribuable').value = f.numero_contribuable || '';
    document.getElementById('delaiLivraison').value = f.delai_livraison_jours || '';
    document.getElementById('telephone').value = f.telephone || '';
    document.getElementById('email').value = f.email || '';
    document.getElementById('ville').value = f.ville || '';
    document.getElementById('pays').value = f.pays || 'Burundi';
    document.getElementById('adresse').value = f.adresse || '';
    document.getElementById('notes').value = f.notes || '';
    document.getElementById('actif').checked = !!f.actif;

    clearFormErrors();
    document.getElementById('fournisseurModal').classList.add('open');
}

async function toggleActif(id) {
    try {
        const response = await Api.post(`/fournisseurs/${id}/toggle-actif`);
        Toast.success(response.message);
        await loadFournisseurs(State.pagination.current_page || 1);
    } catch (error) {
        Toast.error(error.message);
    }
}

function deleteFournisseur(id) {
    const f = State.fournisseurs.find(x => x.id === id);
    if (!f) return;

    showConfirm(
        `Voulez-vous vraiment supprimer <strong>${escapeHtml(f.nom)}</strong> ?<br><small>Le fournisseur sera marqué comme supprimé (soft delete).</small>`,
        async () => {
            try {
                const response = await Api.delete(`/fournisseurs/${id}`);
                Toast.success(response.message || 'Fournisseur supprimé.');
                await loadFournisseurs(State.pagination.current_page || 1);
            } catch (error) {
                Toast.error(error.message);
            }
        }
    );
}

// ============================================================
// FORMULAIRE
// ============================================================

async function submitFournisseurForm(e) {
    e.preventDefault();
    clearFormErrors();

    const btn = document.getElementById('modalSubmitBtn');
    const originalText = document.getElementById('submitBtnText').textContent;
    btn.disabled = true;
    document.getElementById('submitBtnText').textContent = 'Enregistrement...';

    const delaiValue = document.getElementById('delaiLivraison').value;

    const data = {
        nom:                    document.getElementById('nom').value.trim(),
        raison_sociale:         document.getElementById('raisonSociale').value.trim() || null,
        numero_contribuable:    document.getElementById('numeroContribuable').value.trim() || null,
        delai_livraison_jours:  delaiValue ? parseInt(delaiValue, 10) : null,
        telephone:              document.getElementById('telephone').value.trim() || null,
        email:                  document.getElementById('email').value.trim() || null,
        ville:                  document.getElementById('ville').value.trim() || null,
        pays:                   document.getElementById('pays').value.trim() || null,
        adresse:                document.getElementById('adresse').value.trim() || null,
        notes:                  document.getElementById('notes').value.trim() || null,
        actif:                  document.getElementById('actif').checked,
    };

    try {
        let response;
        if (State.editingId) {
            response = await Api.put(`/fournisseurs/${State.editingId}`, data);
        } else {
            response = await Api.post('/fournisseurs', data);
        }

        Toast.success(response.message);
        closeModal('fournisseurModal');
        await loadFournisseurs(State.pagination.current_page || 1);

        // Rafraîchir les villes
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

    // Vider sauf la première option
    while (select.options.length > 1) {
        select.remove(1);
    }

    try {
        const response = await Api.get('/fournisseurs/villes');
        (response.data || []).forEach(ville => {
            const option = document.createElement('option');
            option.value = ville;
            option.textContent = ville;
            select.appendChild(option);
        });

        if (current) select.value = current;
    } catch (e) {
        // Silencieux
    }
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

    safe('modalCloseBtn', 'click', () => closeModal('fournisseurModal'));
    safe('modalCancelBtn', 'click', () => closeModal('fournisseurModal'));
    safe('confirmCloseBtn', 'click', () => closeModal('confirmModal'));
    safe('confirmCancelBtn', 'click', () => closeModal('confirmModal'));

    safe('confirmOkBtn', 'click', async () => {
        if (confirmCallback) await confirmCallback();
        closeModal('confirmModal');
        confirmCallback = null;
    });

    safe('fournisseurForm', 'submit', submitFournisseurForm);

    // Filtres
    let searchTimeout;
    safe('searchInput', 'input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            State.filters.search = e.target.value.trim();
            loadFournisseurs(1);
        }, 400);
    });

    safe('filterVille', 'change', (e) => {
        State.filters.ville = e.target.value;
        loadFournisseurs(1);
    });

    safe('filterActif', 'change', (e) => {
        State.filters.actif = e.target.value;
        loadFournisseurs(1);
    });

    safe('resetFiltersBtn', 'click', () => {
        State.filters = { search: '', ville: '', actif: '' };
        document.getElementById('searchInput').value = '';
        document.getElementById('filterVille').value = '';
        document.getElementById('filterActif').value = '';
        loadFournisseurs(1);
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
        nom:                    'nom',
        raison_sociale:         'raisonSociale',
        numero_contribuable:    'numeroContribuable',
        delai_livraison_jours:  'delaiLivraison',
        telephone:              'telephone',
        email:                  'email',
        ville:                  'ville',
        pays:                   'pays',
        adresse:                'adresse',
        notes:                  'notes',
    };
    return map[field] || field;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}