/**
 * Logique de la page Ordonnances (CRUD complet).
 */

// === 1. Protéger la page ===
Guard.requireAuth();

// === 2. État ===
const State = {
    ordonnances: [],
    animaux: [],
    veterinaires: [],
    pagination: { current_page: 1, last_page: 1, per_page: 20, total: 0 },
    filters: {
        search:         '',
        veterinaire_id: '',
        animal_id:      '',
        validite:       '',
    },
    editingId: null,
};

// === 3. Init ===
document.addEventListener('DOMContentLoaded', async () => {
    // Charger les listes pour les dropdowns EN PREMIER
    try {
        await Promise.all([loadAnimaux(), loadVeterinaires()]);
    } catch (e) {
        console.warn('[Ordonnances] Erreur chargement listes (non bloquant)', e);
    }

    try {
        await loadOrdonnances();
    } catch (error) {
        console.error('[Ordonnances] loadOrdonnances a échoué', error);
    }

    setupEventListeners();
});

// ============================================================
// CHARGEMENT
// ============================================================

async function loadOrdonnances(page = 1) {
    const tbody = document.getElementById('ordonnancesTbody');
    tbody.innerHTML = `<tr><td colspan="6" class="empty"><div class="spinner" style="margin:20px auto;"></div></td></tr>`;

    try {
        const params = new URLSearchParams({ page, per_page: 20 });

        if (State.filters.search)         params.append('search', State.filters.search);
        if (State.filters.veterinaire_id) params.append('veterinaire_id', State.filters.veterinaire_id);
        if (State.filters.animal_id)      params.append('animal_id', State.filters.animal_id);
        if (State.filters.validite)       params.append('validite', State.filters.validite);

        const response = await Api.get(`/ordonnances?${params}`);

        State.ordonnances = response.data || [];
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

async function loadAnimaux() {
    try {
        const response = await Api.get('/animaux?per_page=100');
        State.animaux = response.data || [];

        // Remplir le filtre
        const filterSelect = document.getElementById('filterAnimal');
        State.animaux.forEach(a => {
            const nom = a.nom || `Animal #${a.id}`;
            const opt = document.createElement('option');
            opt.value = a.id;
            opt.textContent = nom;
            filterSelect.appendChild(opt);
        });

        // Remplir le formulaire
        const formSelect = document.getElementById('animalId');
        State.animaux.forEach(a => {
            const nom = a.nom || `Animal #${a.id}`;
            const opt = document.createElement('option');
            opt.value = a.id;
            opt.textContent = nom;
            formSelect.appendChild(opt);
        });
    } catch (e) {
        console.warn('[Ordonnances] loadAnimaux a échoué', e);
    }
}

async function loadVeterinaires() {
    try {
        const response = await Api.get('/veterinaires?per_page=100');
        State.veterinaires = response.data || [];

        // Remplir le filtre
        const filterSelect = document.getElementById('filterVeterinaire');
        State.veterinaires.forEach(v => {
            const nom = v.nom_complet || `Dr ${v.prenom || ''} ${v.nom}`.trim();
            const opt = document.createElement('option');
            opt.value = v.id;
            opt.textContent = nom;
            filterSelect.appendChild(opt);
        });

        // Remplir le formulaire
        const formSelect = document.getElementById('veterinaireId');
        State.veterinaires.forEach(v => {
            const nom = v.nom_complet || `Dr ${v.prenom || ''} ${v.nom}`.trim();
            const opt = document.createElement('option');
            opt.value = v.id;
            opt.textContent = nom;
            formSelect.appendChild(opt);
        });
    } catch (e) {
        console.warn('[Ordonnances] loadVeterinaires a échoué', e);
    }
}

// ============================================================
// RENDU
// ============================================================

function renderTable() {
    const tbody = document.getElementById('ordonnancesTbody');

    if (!State.ordonnances.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty">
                    <div class="empty-state">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                        <p>Aucune ordonnance trouvée</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = State.ordonnances.map(o => {
        const animalNom = o.animal?.nom || '—';
        const veterinaireNom = o.veterinaire?.nom_complet
            || (o.veterinaire ? `Dr ${o.veterinaire.prenom || ''} ${o.veterinaire.nom}`.trim() : '—');

        // Validité
        let validiteBadge = '<span class="badge badge-neutral">—</span>';
        if (o.est_valide !== undefined) {
            validiteBadge = o.est_valide
                ? '<span class="badge badge-success">Valide</span>'
                : '<span class="badge badge-danger">Expirée</span>';
        }

        return `
            <tr>
                <td>
                    <strong>${escapeHtml(o.numero_ordonnance || `ORD-${o.id}`)}</strong>
                </td>
                <td>${escapeHtml(animalNom)}</td>
                <td>${escapeHtml(veterinaireNom)}</td>
                <td>${o.date_prescription ? formatDate(o.date_prescription) : '—'}</td>
                <td>${validiteBadge}</td>
                <td class="text-right">
                    <button class="btn btn-ghost btn-icon" data-action="edit" data-id="${o.id}" title="Modifier">
                        <span data-icon="edit"></span>
                    </button>
                    <button class="btn btn-ghost btn-icon" data-action="delete" data-id="${o.id}" title="Supprimer">
                        <span data-icon="trash"></span>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    tbody.querySelectorAll('[data-icon]').forEach(el => {
        const name = el.getAttribute('data-icon');
        if (Icons[name]) el.innerHTML = Icons[name];
    });

    attachRowListeners();
}

function attachRowListeners() {
    const tbody = document.getElementById('ordonnancesTbody');
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
        case 'edit':   editOrdonnance(id); break;
        case 'delete': deleteOrdonnance(id); break;
    }
}

function renderPagination() {
    const container = document.getElementById('paginationContainer');
    const { current_page, last_page, total } = State.pagination;

    if (!last_page || last_page <= 1) {
        container.innerHTML = total
            ? `<div class="pagination-info">${total} ordonnance${total > 1 ? 's' : ''}</div>`
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
    html += `<div class="pagination-info">${total} ordonnance${total > 1 ? 's' : ''} — page ${current_page} / ${last_page}</div>`;

    container.innerHTML = html;
}

function goToPage(page) {
    loadOrdonnances(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================
// ACTIONS
// ============================================================

function openCreateModal() {
    State.editingId = null;
    document.getElementById('modalTitle').textContent = 'Nouvelle ordonnance';
    document.getElementById('submitBtnText').textContent = 'Créer';
    document.getElementById('ordonnanceForm').reset();
    document.getElementById('datePrescription').value = new Date().toISOString().split('T')[0];
    clearFormErrors();
    document.getElementById('ordonnanceModal').classList.add('open');
}

function editOrdonnance(id) {
    const o = State.ordonnances.find(x => x.id === id);
    if (!o) return;

    State.editingId = id;
    document.getElementById('modalTitle').textContent = 'Modifier l\'ordonnance';
    document.getElementById('submitBtnText').textContent = 'Enregistrer';

    document.getElementById('ordonnanceId').value = o.id;
    document.getElementById('animalId').value = o.animal_id || '';
    document.getElementById('veterinaireId').value = o.veterinaire_id || '';
    document.getElementById('numeroOrdonnance').value = o.numero_ordonnance || '';
    document.getElementById('datePrescription').value = o.date_prescription || '';
    document.getElementById('dateFinValidite').value = o.date_fin_validite || '';
    document.getElementById('diagnostic').value = o.diagnostic || '';
    document.getElementById('observations').value = o.observations || '';
    document.getElementById('fichierScan').value = o.fichier_scan || '';

    clearFormErrors();
    document.getElementById('ordonnanceModal').classList.add('open');
}

function deleteOrdonnance(id) {
    const o = State.ordonnances.find(x => x.id === id);
    if (!o) return;

    const numero = o.numero_ordonnance || `ORD-${o.id}`;

    showConfirm(
        `Voulez-vous vraiment supprimer l'ordonnance <strong>${escapeHtml(numero)}</strong> ?`,
        async () => {
            try {
                const response = await Api.delete(`/ordonnances/${id}`);
                Toast.success(response.message || 'Ordonnance supprimée.');
                await loadOrdonnances(State.pagination.current_page || 1);
            } catch (error) {
                Toast.error(error.message);
            }
        }
    );
}

// ============================================================
// FORMULAIRE
// ============================================================

async function submitOrdonnanceForm(e) {
    e.preventDefault();
    clearFormErrors();

    const btn = document.getElementById('modalSubmitBtn');
    const originalText = document.getElementById('submitBtnText').textContent;
    btn.disabled = true;
    document.getElementById('submitBtnText').textContent = 'Enregistrement...';

    const data = {
        animal_id:         parseInt(document.getElementById('animalId').value, 10),
        veterinaire_id:    document.getElementById('veterinaireId').value
                            ? parseInt(document.getElementById('veterinaireId').value, 10)
                            : null,
        numero_ordonnance: document.getElementById('numeroOrdonnance').value.trim() || null,
        date_prescription: document.getElementById('datePrescription').value,
        date_fin_validite: document.getElementById('dateFinValidite').value || null,
        diagnostic:        document.getElementById('diagnostic').value.trim() || null,
        observations:      document.getElementById('observations').value.trim() || null,
        fichier_scan:      document.getElementById('fichierScan').value.trim() || null,
    };

    try {
        let response;
        if (State.editingId) {
            response = await Api.put(`/ordonnances/${State.editingId}`, data);
        } else {
            response = await Api.post('/ordonnances', data);
        }

        Toast.success(response.message);
        closeModal('ordonnanceModal');
        await loadOrdonnances(State.pagination.current_page || 1);
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

    safe('modalCloseBtn', 'click', () => closeModal('ordonnanceModal'));
    safe('modalCancelBtn', 'click', () => closeModal('ordonnanceModal'));
    safe('confirmCloseBtn', 'click', () => closeModal('confirmModal'));
    safe('confirmCancelBtn', 'click', () => closeModal('confirmModal'));

    safe('confirmOkBtn', 'click', async () => {
        if (confirmCallback) await confirmCallback();
        closeModal('confirmModal');
        confirmCallback = null;
    });

    safe('ordonnanceForm', 'submit', submitOrdonnanceForm);

    // Filtres
    let searchTimeout;
    safe('searchInput', 'input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            State.filters.search = e.target.value.trim();
            loadOrdonnances(1);
        }, 400);
    });

    safe('filterVeterinaire', 'change', (e) => {
        State.filters.veterinaire_id = e.target.value;
        loadOrdonnances(1);
    });

    safe('filterAnimal', 'change', (e) => {
        State.filters.animal_id = e.target.value;
        loadOrdonnances(1);
    });

    safe('filterValidite', 'change', (e) => {
        State.filters.validite = e.target.value;
        loadOrdonnances(1);
    });

    safe('resetFiltersBtn', 'click', () => {
        State.filters = { search: '', veterinaire_id: '', animal_id: '', validite: '' };
        document.getElementById('searchInput').value = '';
        document.getElementById('filterVeterinaire').value = '';
        document.getElementById('filterAnimal').value = '';
        document.getElementById('filterValidite').value = '';
        loadOrdonnances(1);
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
        animal_id: 'animalId',
        veterinaire_id: 'veterinaireId',
        numero_ordonnance: 'numeroOrdonnance',
        date_prescription: 'datePrescription',
        date_fin_validite: 'dateFinValidite',
        diagnostic: 'diagnostic',
        observations: 'observations',
        fichier_scan: 'fichierScan',
    };
    return map[field] || field;
}

function formatDate(isoString) {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}