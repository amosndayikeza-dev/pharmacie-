/**
 * Logique de la page Espèces (CRUD complet).
 *
 * Le layout (sidebar, header, footer) est injecté par components.js + layout.js.
 * Ce fichier ne contient QUE la logique de la page.
 */

// === 1. Protéger la page ===
Guard.requireAuth();

// === 2. État ===
const State = {
    especes: [],
    pagination: { current_page: 1, last_page: 1, per_page: 20, total: 0 },
    filters: {
        search:    '',
        categorie: '',
        actif:     '',
    },
    editingId: null,
};

// === 3. Init ===
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadEspeces();
    } catch (error) {
        console.error('[Especes] Erreur init:', error);
    }
    setupEventListeners();
});

// ============================================================
// CHARGEMENT
// ============================================================

async function loadEspeces(page = 1) {
    const tbody = document.getElementById('especesTbody');
    tbody.innerHTML = `<tr><td colspan="6" class="empty"><div class="spinner" style="margin:20px auto;"></div></td></tr>`;

    try {
        const params = new URLSearchParams({ page, per_page: 20 });

        if (State.filters.search)    params.append('search', State.filters.search);
        if (State.filters.categorie) params.append('categorie', State.filters.categorie);
        if (State.filters.actif)     params.append('actif', State.filters.actif);

        const response = await Api.get(`/especes?${params}`);

        State.especes = response.data || [];
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

// ============================================================
// RENDU
// ============================================================

function renderTable() {
    const tbody = document.getElementById('especesTbody');

    if (!State.especes.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty">
                    <div class="empty-state">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon"><circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z"/></svg>
                        <p>Aucune espèce trouvée</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    const categorieLabels = {
        compagnie: { label: 'Compagnie', class: 'badge-info' },
        elevage:   { label: 'Élevage',   class: 'badge-warning' },
        volaille:  { label: 'Volaille',  class: 'badge-primary' },
        equin:     { label: 'Équin',     class: 'badge-success' },
        autre:     { label: 'Autre',     class: 'badge-neutral' },
    };

    tbody.innerHTML = State.especes.map(e => {
        const cat = categorieLabels[e.categorie] || { label: e.categorie || '—', class: 'badge-neutral' };

        return `
            <tr>
                <td>
                    <strong>${escapeHtml(e.nom)}</strong>
                </td>
                <td>
                    ${e.nom_scientifique
                        ? `<em class="text-muted">${escapeHtml(e.nom_scientifique)}</em>`
                        : '<span class="text-muted">—</span>'}
                </td>
                <td>
                    <span class="badge ${cat.class}">${escapeHtml(cat.label)}</span>
                </td>
                <td>
                    ${e.description
                        ? `<span class="text-muted truncate">${escapeHtml(e.description)}</span>`
                        : '<span class="text-muted">—</span>'}
                </td>
                <td>
                    ${e.actif
                        ? '<span class="badge badge-success">Actif</span>'
                        : '<span class="badge badge-neutral">Inactif</span>'}
                </td>
                <td class="text-right">
                    <button class="btn btn-ghost btn-icon" data-action="edit" data-id="${e.id}" title="Modifier">
                        <span data-icon="edit"></span>
                    </button>
                    <button class="btn btn-ghost btn-icon" data-action="toggle" data-id="${e.id}" title="${e.actif ? 'Désactiver' : 'Activer'}">
                        <span data-icon="power"></span>
                    </button>
                    <button class="btn btn-ghost btn-icon" data-action="delete" data-id="${e.id}" title="Supprimer">
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
    const tbody = document.getElementById('especesTbody');
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
        case 'edit':   editEspece(id); break;
        case 'toggle': toggleActif(id); break;
        case 'delete': deleteEspece(id); break;
    }
}

function renderPagination() {
    const container = document.getElementById('paginationContainer');
    const { current_page, last_page, total } = State.pagination;

    if (!last_page || last_page <= 1) {
        container.innerHTML = total
            ? `<div class="pagination-info">${total} espèce${total > 1 ? 's' : ''}</div>`
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
    html += `<div class="pagination-info">${total} espèce${total > 1 ? 's' : ''} — page ${current_page} / ${last_page}</div>`;

    container.innerHTML = html;
}

function goToPage(page) {
    loadEspeces(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================
// ACTIONS
// ============================================================

function openCreateModal() {
    State.editingId = null;
    document.getElementById('modalTitle').textContent = 'Nouvelle espèce';
    document.getElementById('submitBtnText').textContent = 'Créer';
    document.getElementById('especeForm').reset();
    document.getElementById('actif').checked = true;
    clearFormErrors();
    document.getElementById('especeModal').classList.add('open');
}

function editEspece(id) {
    const e = State.especes.find(x => x.id === id);
    if (!e) return;

    State.editingId = id;
    document.getElementById('modalTitle').textContent = 'Modifier l\'espèce';
    document.getElementById('submitBtnText').textContent = 'Enregistrer';

    document.getElementById('especeId').value = e.id;
    document.getElementById('nom').value = e.nom || '';
    document.getElementById('nomScientifique').value = e.nom_scientifique || '';
    document.getElementById('categorie').value = e.categorie || '';
    document.getElementById('description').value = e.description || '';
    document.getElementById('actif').checked = !!e.actif;

    clearFormErrors();
    document.getElementById('especeModal').classList.add('open');
}

async function toggleActif(id) {
    try {
        const response = await Api.post(`/especes/${id}/toggle-actif`);
        Toast.success(response.message);
        await loadEspeces(State.pagination.current_page || 1);
    } catch (error) {
        Toast.error(error.message);
    }
}

function deleteEspece(id) {
    const e = State.especes.find(x => x.id === id);
    if (!e) return;

    showConfirm(
        `Voulez-vous vraiment supprimer <strong>${escapeHtml(e.nom)}</strong> ?<br><small>L'espèce sera marquée comme supprimée (soft delete).</small>`,
        async () => {
            try {
                const response = await Api.delete(`/especes/${id}`);
                Toast.success(response.message || 'Espèce supprimée.');
                await loadEspeces(State.pagination.current_page || 1);
            } catch (error) {
                Toast.error(error.message);
            }
        }
    );
}

// ============================================================
// FORMULAIRE
// ============================================================

async function submitEspeceForm(e) {
    e.preventDefault();
    clearFormErrors();

    const btn = document.getElementById('modalSubmitBtn');
    const originalText = document.getElementById('submitBtnText').textContent;
    btn.disabled = true;
    document.getElementById('submitBtnText').textContent = 'Enregistrement...';

    const data = {
        nom:              document.getElementById('nom').value.trim(),
        nom_scientifique: document.getElementById('nomScientifique').value.trim() || null,
        categorie:        document.getElementById('categorie').value,
        description:      document.getElementById('description').value.trim() || null,
        actif:            document.getElementById('actif').checked,
    };

    try {
        let response;
        if (State.editingId) {
            response = await Api.put(`/especes/${State.editingId}`, data);
        } else {
            response = await Api.post('/especes', data);
        }

        Toast.success(response.message);
        closeModal('especeModal');
        await loadEspeces(State.pagination.current_page || 1);
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

    safe('modalCloseBtn', 'click', () => closeModal('especeModal'));
    safe('modalCancelBtn', 'click', () => closeModal('especeModal'));
    safe('confirmCloseBtn', 'click', () => closeModal('confirmModal'));
    safe('confirmCancelBtn', 'click', () => closeModal('confirmModal'));

    safe('confirmOkBtn', 'click', async () => {
        if (confirmCallback) await confirmCallback();
        closeModal('confirmModal');
        confirmCallback = null;
    });

    safe('especeForm', 'submit', submitEspeceForm);

    // Filtres
    let searchTimeout;
    safe('searchInput', 'input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            State.filters.search = e.target.value.trim();
            loadEspeces(1);
        }, 400);
    });

    safe('filterCategorie', 'change', (e) => {
        State.filters.categorie = e.target.value;
        loadEspeces(1);
    });

    safe('filterActif', 'change', (e) => {
        State.filters.actif = e.target.value;
        loadEspeces(1);
    });

    safe('resetFiltersBtn', 'click', () => {
        State.filters = { search: '', categorie: '', actif: '' };
        document.getElementById('searchInput').value = '';
        document.getElementById('filterCategorie').value = '';
        document.getElementById('filterActif').value = '';
        loadEspeces(1);
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
        nom:              'nom',
        nom_scientifique: 'nomScientifique',
        categorie:        'categorie',
        description:      'description',
    };
    return map[field] || field;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}