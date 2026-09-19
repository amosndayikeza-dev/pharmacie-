/**
 * Logique de la page Vétérinaires (CRUD complet).
 */

// === 1. Protéger la page ===
Guard.requireAuth();

// === 2. État ===
const State = {
    veterinaires: [],
    pagination: { current_page: 1, last_page: 1, per_page: 20, total: 0 },
    filters: {
        search:     '',
        specialite: '',
        actif:      '',
    },
    editingId: null,
};

// === 3. Init ===
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadSpecialites();
    } catch (e) {
        console.warn('[Veterinaires] loadSpecialites a échoué (non bloquant)', e);
    }

    try {
        await loadVeterinaires();
    } catch (e) {
        console.error('[Veterinaires] loadVeterinaires a échoué', e);
    }

    setupEventListeners();
});

// ============================================================
// CHARGEMENT
// ============================================================

async function loadVeterinaires(page = 1) {
    const tbody = document.getElementById('veterinairesTbody');
    tbody.innerHTML = `<tr><td colspan="6" class="empty"><div class="spinner" style="margin:20px auto;"></div></td></tr>`;

    try {
        const params = new URLSearchParams({ page, per_page: 20 });

        if (State.filters.search)     params.append('search', State.filters.search);
        if (State.filters.specialite) params.append('specialite', State.filters.specialite);
        if (State.filters.actif)      params.append('actif', State.filters.actif);

        const response = await Api.get(`/veterinaires?${params}`);

        State.veterinaires = response.data || [];
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

async function loadSpecialites() {
    try {
        const response = await Api.get('/veterinaires/specialites');
        const select = document.getElementById('filterSpecialite');
        if (!select) return;

        (response.data || []).forEach(spec => {
            const option = document.createElement('option');
            option.value = spec;
            option.textContent = spec;
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
    const tbody = document.getElementById('veterinairesTbody');

    if (!State.veterinaires.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty">
                    <div class="empty-state">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/></svg>
                        <p>Aucun vétérinaire trouvé</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = State.veterinaires.map(v => {
        const nomComplet = v.nom_complet || `${v.prenom || ''} ${v.nom}`.trim();

        return `
            <tr>
                <td>
                    <strong>${escapeHtml(nomComplet)}</strong>
                </td>
                <td>
                    ${v.numero_ordre
                        ? `<code>${escapeHtml(v.numero_ordre)}</code>`
                        : '<span class="text-muted">—</span>'}
                </td>
                <td>
                    ${v.specialite
                        ? `<span class="badge badge-info">${escapeHtml(v.specialite)}</span>`
                        : '—'}
                </td>
                <td>
                    ${v.telephone ? `<div>📞 ${escapeHtml(v.telephone)}</div>` : ''}
                    ${v.email ? `<small class="text-muted">${escapeHtml(v.email)}</small>` : ''}
                    ${!v.telephone && !v.email ? '<span class="text-muted">—</span>' : ''}
                </td>
                <td>
                    ${v.actif
                        ? '<span class="badge badge-success">Actif</span>'
                        : '<span class="badge badge-neutral">Inactif</span>'}
                </td>
                <td class="text-right">
                    <button class="btn btn-ghost btn-icon" data-action="edit" data-id="${v.id}" title="Modifier">
                        <span data-icon="edit"></span>
                    </button>
                    <button class="btn btn-ghost btn-icon" data-action="toggle" data-id="${v.id}" title="${v.actif ? 'Désactiver' : 'Activer'}">
                        <span data-icon="power"></span>
                    </button>
                    <button class="btn btn-ghost btn-icon" data-action="delete" data-id="${v.id}" title="Supprimer">
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
    const tbody = document.getElementById('veterinairesTbody');
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
        case 'edit':   editVeterinaire(id); break;
        case 'toggle': toggleActif(id); break;
        case 'delete': deleteVeterinaire(id); break;
    }
}

function renderPagination() {
    const container = document.getElementById('paginationContainer');
    const { current_page, last_page, total } = State.pagination;

    if (!last_page || last_page <= 1) {
        container.innerHTML = total
            ? `<div class="pagination-info">${total} vétérinaire${total > 1 ? 's' : ''}</div>`
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
    html += `<div class="pagination-info">${total} vétérinaire${total > 1 ? 's' : ''} — page ${current_page} / ${last_page}</div>`;

    container.innerHTML = html;
}

function goToPage(page) {
    loadVeterinaires(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================
// ACTIONS
// ============================================================

function openCreateModal() {
    State.editingId = null;
    document.getElementById('modalTitle').textContent = 'Nouveau vétérinaire';
    document.getElementById('submitBtnText').textContent = 'Créer';
    document.getElementById('veterinaireForm').reset();
    document.getElementById('actif').checked = true;
    clearFormErrors();
    document.getElementById('veterinaireModal').classList.add('open');
}

function editVeterinaire(id) {
    const v = State.veterinaires.find(x => x.id === id);
    if (!v) return;

    State.editingId = id;
    document.getElementById('modalTitle').textContent = 'Modifier le vétérinaire';
    document.getElementById('submitBtnText').textContent = 'Enregistrer';

    document.getElementById('veterinaireId').value = v.id;
    document.getElementById('nom').value = v.nom || '';
    document.getElementById('prenom').value = v.prenom || '';
    document.getElementById('numeroOrdre').value = v.numero_ordre || '';
    document.getElementById('specialite').value = v.specialite || '';
    document.getElementById('telephone').value = v.telephone || '';
    document.getElementById('email').value = v.email || '';
    document.getElementById('adresseCabinet').value = v.adresse_cabinet || '';
    document.getElementById('actif').checked = !!v.actif;

    clearFormErrors();
    document.getElementById('veterinaireModal').classList.add('open');
}

async function toggleActif(id) {
    try {
        const response = await Api.post(`/veterinaires/${id}/toggle-actif`);
        Toast.success(response.message);
        await loadVeterinaires(State.pagination.current_page || 1);
    } catch (error) {
        Toast.error(error.message);
    }
}

function deleteVeterinaire(id) {
    const v = State.veterinaires.find(x => x.id === id);
    if (!v) return;

    const nomComplet = v.nom_complet || `${v.prenom || ''} ${v.nom}`.trim();

    showConfirm(
        `Voulez-vous vraiment supprimer <strong>${escapeHtml(nomComplet)}</strong> ?<br><small>Le vétérinaire sera marqué comme supprimé (soft delete).</small>`,
        async () => {
            try {
                const response = await Api.delete(`/veterinaires/${id}`);
                Toast.success(response.message || 'Vétérinaire supprimé.');
                await loadVeterinaires(State.pagination.current_page || 1);
            } catch (error) {
                Toast.error(error.message);
            }
        }
    );
}

// ============================================================
// FORMULAIRE
// ============================================================

async function submitVeterinaireForm(e) {
    e.preventDefault();
    clearFormErrors();

    const btn = document.getElementById('modalSubmitBtn');
    const originalText = document.getElementById('submitBtnText').textContent;
    btn.disabled = true;
    document.getElementById('submitBtnText').textContent = 'Enregistrement...';

    const data = {
        nom:             document.getElementById('nom').value.trim(),
        prenom:          document.getElementById('prenom').value.trim() || null,
        numero_ordre:    document.getElementById('numeroOrdre').value.trim() || null,
        specialite:      document.getElementById('specialite').value.trim() || null,
        telephone:       document.getElementById('telephone').value.trim() || null,
        email:           document.getElementById('email').value.trim() || null,
        adresse_cabinet: document.getElementById('adresseCabinet').value.trim() || null,
        actif:           document.getElementById('actif').checked,
    };

    try {
        let response;
        if (State.editingId) {
            response = await Api.put(`/veterinaires/${State.editingId}`, data);
        } else {
            response = await Api.post('/veterinaires', data);
        }

        Toast.success(response.message);
        closeModal('veterinaireModal');
        await loadVeterinaires(State.pagination.current_page || 1);

        // Rafraîchir les spécialités si nécessaire
        await refreshSpecialites();
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

async function refreshSpecialites() {
    const select = document.getElementById('filterSpecialite');
    if (!select) return;

    // Garder la valeur actuelle
    const current = select.value;

    // Vider sauf la première option
    while (select.options.length > 1) {
        select.remove(1);
    }

    // Recharger
    try {
        const response = await Api.get('/veterinaires/specialites');
        (response.data || []).forEach(spec => {
            const option = document.createElement('option');
            option.value = spec;
            option.textContent = spec;
            select.appendChild(option);
        });

        // Restaurer la sélection
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

    safe('modalCloseBtn', 'click', () => closeModal('veterinaireModal'));
    safe('modalCancelBtn', 'click', () => closeModal('veterinaireModal'));
    safe('confirmCloseBtn', 'click', () => closeModal('confirmModal'));
    safe('confirmCancelBtn', 'click', () => closeModal('confirmModal'));

    safe('confirmOkBtn', 'click', async () => {
        if (confirmCallback) await confirmCallback();
        closeModal('confirmModal');
        confirmCallback = null;
    });

    safe('veterinaireForm', 'submit', submitVeterinaireForm);

    // Filtres
    let searchTimeout;
    safe('searchInput', 'input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            State.filters.search = e.target.value.trim();
            loadVeterinaires(1);
        }, 400);
    });

    safe('filterSpecialite', 'change', (e) => {
        State.filters.specialite = e.target.value;
        loadVeterinaires(1);
    });

    safe('filterActif', 'change', (e) => {
        State.filters.actif = e.target.value;
        loadVeterinaires(1);
    });

    safe('resetFiltersBtn', 'click', () => {
        State.filters = { search: '', specialite: '', actif: '' };
        document.getElementById('searchInput').value = '';
        document.getElementById('filterSpecialite').value = '';
        document.getElementById('filterActif').value = '';
        loadVeterinaires(1);
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
        nom:             'nom',
        prenom:          'prenom',
        numero_ordre:    'numeroOrdre',
        specialite:      'specialite',
        telephone:       'telephone',
        email:           'email',
        adresse_cabinet: 'adresseCabinet',
    };
    return map[field] || field;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}