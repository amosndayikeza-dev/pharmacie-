/**
 * Logique de la page Animaux (CRUD complet).
 */

// === 1. Protéger la page ===
Guard.requireAuth();

// === 2. État ===
const State = {
    animaux: [],
    especes: [],
    proprietaires: [],
    pagination: { current_page: 1, last_page: 1, per_page: 20, total: 0 },
    filters: {
        search:       '',
        espece_id:    '',
        proprietaire_id: '',
        vivant:       '',
    },
    editingId: null,
};

// === 3. Init ===
document.addEventListener('DOMContentLoaded', async () => {
    // Charger les listes pour les dropdowns EN PREMIER
    try {
        await Promise.all([loadEspeces(), loadProprietaires()]);
    } catch (e) {
        console.warn('[Animaux] Erreur chargement listes (non bloquant)', e);
    }

    // Charger les animaux
    try {
        await loadAnimaux();
    } catch (error) {
        console.error('[Animaux] loadAnimaux a échoué', error);
    }

    setupEventListeners();
});

// ============================================================
// CHARGEMENT
// ============================================================

async function loadAnimaux(page = 1) {
    const tbody = document.getElementById('animauxTbody');
    tbody.innerHTML = `<tr><td colspan="7" class="empty"><div class="spinner" style="margin:20px auto;"></div></td></tr>`;

    try {
        const params = new URLSearchParams({ page, per_page: 20 });

        if (State.filters.search)          params.append('search', State.filters.search);
        if (State.filters.espece_id)       params.append('espece_id', State.filters.espece_id);
        if (State.filters.proprietaire_id) params.append('proprietaire_id', State.filters.proprietaire_id);
        if (State.filters.vivant)          params.append('vivant', State.filters.vivant);

        const response = await Api.get(`/animaux?${params}`);

        State.animaux = response.data || [];
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

async function loadEspeces() {
    try {
        const response = await Api.get('/especes?per_page=100');
        State.especes = response.data || [];

        // Remplir le filtre
        const filterSelect = document.getElementById('filterEspece');
        State.especes.forEach(e => {
            const opt = document.createElement('option');
            opt.value = e.id;
            opt.textContent = e.nom;
            filterSelect.appendChild(opt);
        });

        // Remplir le formulaire
        const formSelect = document.getElementById('especeId');
        State.especes.forEach(e => {
            const opt = document.createElement('option');
            opt.value = e.id;
            opt.textContent = e.nom;
            formSelect.appendChild(opt);
        });
    } catch (e) {
        console.warn('[Animaux] loadEspeces a échoué', e);
    }
}

async function loadProprietaires() {
    try {
        const response = await Api.get('/proprietaires?per_page=100');
        State.proprietaires = response.data || [];

        // Remplir le filtre
        const filterSelect = document.getElementById('filterProprietaire');
        State.proprietaires.forEach(p => {
            const nom = p.nom_complet || `${p.prenom || ''} ${p.nom}`.trim();
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = nom;
            filterSelect.appendChild(opt);
        });

        // Remplir le formulaire
        const formSelect = document.getElementById('proprietaireId');
        State.proprietaires.forEach(p => {
            const nom = p.nom_complet || `${p.prenom || ''} ${p.nom}`.trim();
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = nom;
            formSelect.appendChild(opt);
        });
    } catch (e) {
        console.warn('[Animaux] loadProprietaires a échoué', e);
    }
}

// ============================================================
// RENDU
// ============================================================

function renderTable() {
    const tbody = document.getElementById('animauxTbody');

    if (!State.animaux.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty">
                    <div class="empty-state">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon"><circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z"/></svg>
                        <p>Aucun animal trouvé</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = State.animaux.map(a => {
        const nomAffiche = a.nom || `Animal #${a.id}`;
        const espece    = a.espece?.nom || '—';
        const proprietaire = a.proprietaire
            ? (a.proprietaire.nom_complet || `${a.proprietaire.prenom || ''} ${a.proprietaire.nom}`.trim())
            : '—';

        // Sexe + âge
        let sexeAge = [];
        if (a.sexe && a.sexe !== 'Inconnu') sexeAge.push(a.sexe);
        if (a.age_annees !== undefined && a.age_annees !== null) {
            sexeAge.push(`${a.age_annees} an${a.age_annees > 1 ? 's' : ''}`);
        }
        const sexeAgeStr = sexeAge.length ? sexeAge.join(' · ') : '—';

        return `
            <tr>
                <td>
                    <strong>${escapeHtml(nomAffiche)}</strong>
                    ${a.numero_identification ? `<br><small class="text-muted">${escapeHtml(a.numero_identification)}</small>` : ''}
                </td>
                <td><span class="badge badge-info">${escapeHtml(espece)}</span></td>
                <td>${escapeHtml(proprietaire)}</td>
                <td>${sexeAgeStr}</td>
                <td>${a.poids_kg ? a.poids_kg + ' kg' : '<span class="text-muted">—</span>'}</td>
                <td>
                    ${a.vivant
                        ? '<span class="badge badge-success">Vivant</span>'
                        : '<span class="badge badge-neutral">Décédé / Vendu</span>'}
                </td>
                <td class="text-right">
                    <button class="btn btn-ghost btn-icon" data-action="edit" data-id="${a.id}" title="Modifier">
                        <span data-icon="edit"></span>
                    </button>
                    <button class="btn btn-ghost btn-icon" data-action="delete" data-id="${a.id}" title="Supprimer">
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
    const tbody = document.getElementById('animauxTbody');
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
        case 'edit':   editAnimal(id); break;
        case 'delete': deleteAnimal(id); break;
    }
}

function renderPagination() {
    const container = document.getElementById('paginationContainer');
    const { current_page, last_page, total } = State.pagination;

    if (!last_page || last_page <= 1) {
        container.innerHTML = total
            ? `<div class="pagination-info">${total} animal${total > 1 ? 'x' : ''}</div>`
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
    html += `<div class="pagination-info">${total} animal${total > 1 ? 'x' : ''} — page ${current_page} / ${last_page}</div>`;

    container.innerHTML = html;
}

function goToPage(page) {
    loadAnimaux(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================
// ACTIONS
// ============================================================

function openCreateModal() {
    State.editingId = null;
    document.getElementById('modalTitle').textContent = 'Nouvel animal';
    document.getElementById('submitBtnText').textContent = 'Créer';
    document.getElementById('animalForm').reset();
    document.getElementById('vivant').checked = true;
    document.getElementById('sexe').value = 'Inconnu';
    clearFormErrors();
    document.getElementById('animalModal').classList.add('open');
}

function editAnimal(id) {
    const a = State.animaux.find(x => x.id === id);
    if (!a) return;

    State.editingId = id;
    document.getElementById('modalTitle').textContent = 'Modifier l\'animal';
    document.getElementById('submitBtnText').textContent = 'Enregistrer';

    document.getElementById('animalId').value = a.id;
    document.getElementById('proprietaireId').value = a.proprietaire_id || '';
    document.getElementById('especeId').value = a.espece_id || '';
    document.getElementById('nom').value = a.nom || '';
    document.getElementById('numeroIdentification').value = a.numero_identification || '';
    document.getElementById('sexe').value = a.sexe || 'Inconnu';
    document.getElementById('dateNaissance').value = a.date_naissance || '';
    document.getElementById('race').value = a.race || '';
    document.getElementById('couleur').value = a.couleur || '';
    document.getElementById('poidsKg').value = a.poids_kg || '';
    document.getElementById('taille').value = a.taille || '';
    document.getElementById('allergies').value = a.allergies || '';
    document.getElementById('antecedents').value = a.antecedents || '';
    document.getElementById('notes').value = a.notes || '';
    document.getElementById('sterilise').checked = !!a.sterilise;
    document.getElementById('gestante').checked = !!a.gestante;
    document.getElementById('allaitante').checked = !!a.allaitante;
    document.getElementById('vivant').checked = a.vivant !== false;

    clearFormErrors();
    document.getElementById('animalModal').classList.add('open');
}

function deleteAnimal(id) {
    const a = State.animaux.find(x => x.id === id);
    if (!a) return;

    const nom = a.nom || `Animal #${a.id}`;

    showConfirm(
        `Voulez-vous vraiment supprimer <strong>${escapeHtml(nom)}</strong> ?<br><small>L'animal sera marqué comme supprimé (soft delete).</small>`,
        async () => {
            try {
                const response = await Api.delete(`/animaux/${id}`);
                Toast.success(response.message || 'Animal supprimé.');
                await loadAnimaux(State.pagination.current_page || 1);
            } catch (error) {
                Toast.error(error.message);
            }
        }
    );
}

// ============================================================
// FORMULAIRE
// ============================================================

async function submitAnimalForm(e) {
    e.preventDefault();
    clearFormErrors();

    const btn = document.getElementById('modalSubmitBtn');
    const originalText = document.getElementById('submitBtnText').textContent;
    btn.disabled = true;
    document.getElementById('submitBtnText').textContent = 'Enregistrement...';

    const poids = document.getElementById('poidsKg').value;

    const data = {
        proprietaire_id:        parseInt(document.getElementById('proprietaireId').value, 10),
        espece_id:              parseInt(document.getElementById('especeId').value, 10),
        nom:                    document.getElementById('nom').value.trim() || null,
        numero_identification:  document.getElementById('numeroIdentification').value.trim() || null,
        sexe:                   document.getElementById('sexe').value || 'Inconnu',
        date_naissance:         document.getElementById('dateNaissance').value || null,
        race:                   document.getElementById('race').value.trim() || null,
        couleur:                document.getElementById('couleur').value.trim() || null,
        poids_kg:               poids ? parseFloat(poids) : null,
        taille:                 document.getElementById('taille').value.trim() || null,
        allergies:              document.getElementById('allergies').value.trim() || null,
        antecedents:            document.getElementById('antecedents').value.trim() || null,
        notes:                  document.getElementById('notes').value.trim() || null,
        sterilise:              document.getElementById('sterilise').checked,
        gestante:               document.getElementById('gestante').checked,
        allaitante:             document.getElementById('allaitante').checked,
        vivant:                 document.getElementById('vivant').checked,
    };

    try {
        let response;
        if (State.editingId) {
            response = await Api.put(`/animaux/${State.editingId}`, data);
        } else {
            response = await Api.post('/animaux', data);
        }

        Toast.success(response.message);
        closeModal('animalModal');
        await loadAnimaux(State.pagination.current_page || 1);
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

    safe('modalCloseBtn', 'click', () => closeModal('animalModal'));
    safe('modalCancelBtn', 'click', () => closeModal('animalModal'));
    safe('confirmCloseBtn', 'click', () => closeModal('confirmModal'));
    safe('confirmCancelBtn', 'click', () => closeModal('confirmModal'));

    safe('confirmOkBtn', 'click', async () => {
        if (confirmCallback) await confirmCallback();
        closeModal('confirmModal');
        confirmCallback = null;
    });

    safe('animalForm', 'submit', submitAnimalForm);

    // Filtres
    let searchTimeout;
    safe('searchInput', 'input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            State.filters.search = e.target.value.trim();
            loadAnimaux(1);
        }, 400);
    });

    safe('filterEspece', 'change', (e) => {
        State.filters.espece_id = e.target.value;
        loadAnimaux(1);
    });

    safe('filterProprietaire', 'change', (e) => {
        State.filters.proprietaire_id = e.target.value;
        loadAnimaux(1);
    });

    safe('filterVivant', 'change', (e) => {
        State.filters.vivant = e.target.value;
        loadAnimaux(1);
    });

    safe('resetFiltersBtn', 'click', () => {
        State.filters = { search: '', espece_id: '', proprietaire_id: '', vivant: '' };
        document.getElementById('searchInput').value = '';
        document.getElementById('filterEspece').value = '';
        document.getElementById('filterProprietaire').value = '';
        document.getElementById('filterVivant').value = '';
        loadAnimaux(1);
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
        proprietaire_id: 'proprietaireId',
        espece_id: 'especeId',
        nom: 'nom',
        numero_identification: 'numeroIdentification',
        sexe: 'sexe',
        date_naissance: 'dateNaissance',
        race: 'race',
        couleur: 'couleur',
        poids_kg: 'poidsKg',
        taille: 'taille',
        allergies: 'allergies',
        antecedents: 'antecedents',
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