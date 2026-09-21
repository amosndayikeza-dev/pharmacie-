/**
 * Logique de la page Vaccinations (CRUD complet + rappels).
 */

// === 1. Protéger la page ===
Guard.requireAuth();

// === 2. État ===
const State = {
    vaccinations: [],
    animaux: [],
    veterinaires: [],
    medicaments: [],
    pagination: { current_page: 1, last_page: 1, per_page: 20, total: 0 },
    filters: {
        search:         '',
        animal_id:      '',
        veterinaire_id: '',
        rappel:         '',
    },
    editingId: null,
    modeRappels: false,  // true = afficher seulement les rappels à venir
    modeRetard: false,   // true = afficher seulement les rappels en retard
};

// === 3. Init ===
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await Promise.all([loadAnimaux(), loadVeterinaires(), loadMedicaments()]);
    } catch (e) {
        console.warn('[Vaccinations] Erreur chargement listes (non bloquant)', e);
    }

    try {
        await loadVaccinations();
    } catch (error) {
        console.error('[Vaccinations] loadVaccinations a échoué', error);
    }

    // Vérifier les rappels en retard
    await checkRappelsRetard();

    setupEventListeners();
});

// ============================================================
// CHARGEMENT
// ============================================================

async function loadVaccinations(page = 1) {
    const tbody = document.getElementById('vaccinationsTbody');
    tbody.innerHTML = `<tr><td colspan="7" class="empty"><div class="spinner" style="margin:20px auto;"></div></td></tr>`;

    try {
        let url;

        // Mode rappels : utiliser l'endpoint dédié
        if (State.modeRappels) {
            url = '/vaccinations/rappels';
        } else if (State.modeRetard) {
            url = '/vaccinations/rappels-en-retard';
        } else {
            const params = new URLSearchParams({ page, per_page: 20 });
            if (State.filters.search)         params.append('search', State.filters.search);
            if (State.filters.animal_id)      params.append('animal_id', State.filters.animal_id);
            if (State.filters.veterinaire_id) params.append('veterinaire_id', State.filters.veterinaire_id);
            if (State.filters.rappel)         params.append('rappel', State.filters.rappel);
            url = `/vaccinations?${params}`;
        }

        const response = await Api.get(url);

        State.vaccinations = response.data || [];
        State.pagination = response.meta || { current_page: 1, last_page: 1, total: State.vaccinations.length };

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

async function loadAnimaux() {
    try {
        const response = await Api.get('/animaux?per_page=100');
        State.animaux = response.data || [];

        // Filtre
        const filterSelect = document.getElementById('filterAnimal');
        State.animaux.forEach(a => {
            const nom = a.nom || `Animal #${a.id}`;
            const opt = document.createElement('option');
            opt.value = a.id;
            opt.textContent = nom;
            filterSelect.appendChild(opt);
        });

        // Formulaire
        const formSelect = document.getElementById('animalId');
        State.animaux.forEach(a => {
            const nom = a.nom || `Animal #${a.id}`;
            const opt = document.createElement('option');
            opt.value = a.id;
            opt.textContent = nom;
            formSelect.appendChild(opt);
        });
    } catch (e) {
        console.warn('[Vaccinations] loadAnimaux a échoué', e);
    }
}

async function loadVeterinaires() {
    try {
        const response = await Api.get('/veterinaires?per_page=100');
        State.veterinaires = response.data || [];

        // Filtre
        const filterSelect = document.getElementById('filterVeterinaire');
        State.veterinaires.forEach(v => {
            const nom = v.nom_complet || `Dr ${v.prenom || ''} ${v.nom}`.trim();
            const opt = document.createElement('option');
            opt.value = v.id;
            opt.textContent = nom;
            filterSelect.appendChild(opt);
        });

        // Formulaire
        const formSelect = document.getElementById('veterinaireId');
        State.veterinaires.forEach(v => {
            const nom = v.nom_complet || `Dr ${v.prenom || ''} ${v.nom}`.trim();
            const opt = document.createElement('option');
            opt.value = v.id;
            opt.textContent = nom;
            formSelect.appendChild(opt);
        });
    } catch (e) {
        console.warn('[Vaccinations] loadVeterinaires a échoué', e);
    }
}

async function loadMedicaments() {
    try {
        // On charge TOUS les médicaments actifs
        // (l'utilisateur choisit celui qui correspond au vaccin)
        const response = await Api.get('/medicaments?per_page=100&actif=true');
        State.medicaments = response.data || [];

        const formSelect = document.getElementById('medicamentId');
        if (!formSelect) return;

        // Vider sauf la première option
        while (formSelect.options.length > 1) formSelect.remove(1);

        // Trier : vaccins en premier (usage_preventif ou "vaccin" dans le nom/catégorie)
        const isVaccin = (m) => {
            if (m.usage_preventif) return true;
            const text = `${m.nom || ''} ${m.categorie || ''}`.toLowerCase();
            return text.includes('vaccin');
        };

        const sorted = [...State.medicaments].sort((a, b) => {
            const aV = isVaccin(a) ? 0 : 1;
            const bV = isVaccin(b) ? 0 : 1;
            if (aV !== bV) return aV - bV;
            return (a.nom || '').localeCompare(b.nom || '');
        });

        sorted.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.id;

            // Ajouter 🩺 devant les vaccins identifiés
            const prefix = isVaccin(m) ? '🩺 ' : '';
            opt.textContent = `${prefix}${m.nom}${m.categorie ? ' (' + m.categorie + ')' : ''}`;

            formSelect.appendChild(opt);
        });
    } catch (e) {
        console.warn('[Vaccinations] loadMedicaments a échoué', e);
    }
}

async function checkRappelsRetard() {
    try {
        const response = await Api.get('/vaccinations/rappels-en-retard');
        const count = (response.data || []).length;

        const banner = document.getElementById('alertRetard');
        if (count > 0) {
            document.getElementById('alertRetardText').textContent =
                `${count} vaccination${count > 1 ? 's ont' : ' a'} un rappel en retard.`;
            banner.style.display = 'flex';
        } else {
            banner.style.display = 'none';
        }
    } catch (e) {
        // Silencieux
    }
}

// ============================================================
// RENDU
// ============================================================

function renderTable() {
    const tbody = document.getElementById('vaccinationsTbody');

    if (!State.vaccinations.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty">
                    <div class="empty-state">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon"><path d="m18 2 4 4"/><path d="m17 7 3-3"/><path d="M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5"/><path d="m9 11 4 4"/><path d="m5 19-3 3"/><path d="m14 4 6 6"/></svg>
                        <p>Aucune vaccination trouvée</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = State.vaccinations.map(v => {
        const animalNom = v.animal?.nom || '—';
        const veterinaireNom = v.veterinaire?.nom_complet
            || (v.veterinaire ? `Dr ${v.veterinaire.prenom || ''} ${v.veterinaire.nom}`.trim() : '—');

        // Statut du rappel
        let rappelStatut = '<span class="badge badge-neutral">—</span>';
        if (v.rappel_en_retard) {
            rappelStatut = '<span class="badge badge-danger">En retard</span>';
        } else if (v.rappel_proche) {
            rappelStatut = '<span class="badge badge-warning">Bientôt</span>';
        } else if (v.date_prochain_rappel) {
            rappelStatut = '<span class="badge badge-success">Programmé</span>';
        }

        return `
            <tr>
                <td>
                    <strong>${escapeHtml(v.nom_vaccin || '—')}</strong>
                    ${v.numero_lot_vaccin ? `<br><small class="text-muted">Lot ${escapeHtml(v.numero_lot_vaccin)}</small>` : ''}
                </td>
                <td>${escapeHtml(animalNom)}</td>
                <td>${escapeHtml(veterinaireNom)}</td>
                <td>${v.date_vaccination ? formatDate(v.date_vaccination) : '—'}</td>
                <td>${v.date_prochain_rappel ? formatDate(v.date_prochain_rappel) : '—'}</td>
                <td>${rappelStatut}</td>
                <td class="text-right">
                    <button class="btn btn-ghost btn-icon" data-action="edit" data-id="${v.id}" title="Modifier">
                        <span data-icon="edit"></span>
                    </button>
                    <button class="btn btn-ghost btn-icon" data-action="delete" data-id="${v.id}" title="Supprimer">
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
    const tbody = document.getElementById('vaccinationsTbody');
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
        case 'edit':   editVaccination(id); break;
        case 'delete': deleteVaccination(id); break;
    }
}

function renderPagination() {
    const container = document.getElementById('paginationContainer');
    const { current_page, last_page, total } = State.pagination;

    // Pas de pagination pour les modes rappels (endpoints dédiés)
    if (State.modeRappels || State.modeRetard) {
        container.innerHTML = `<div class="pagination-info">${total || State.vaccinations.length} résultat(s)</div>`;
        return;
    }

    if (!last_page || last_page <= 1) {
        container.innerHTML = total
            ? `<div class="pagination-info">${total} vaccination${total > 1 ? 's' : ''}</div>`
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
    html += `<div class="pagination-info">${total} vaccination${total > 1 ? 's' : ''} — page ${current_page} / ${last_page}</div>`;

    container.innerHTML = html;
}

function goToPage(page) {
    loadVaccinations(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================
// ACTIONS
// ============================================================

function openCreateModal() {
    State.editingId = null;
    document.getElementById('modalTitle').textContent = 'Nouvelle vaccination';
    document.getElementById('submitBtnText').textContent = 'Créer';
    document.getElementById('vaccinationForm').reset();
    document.getElementById('dateVaccination').value = new Date().toISOString().split('T')[0];
    clearFormErrors();
    document.getElementById('vaccinationModal').classList.add('open');
}

function editVaccination(id) {
    const v = State.vaccinations.find(x => x.id === id);
    if (!v) return;

    State.editingId = id;
    document.getElementById('modalTitle').textContent = 'Modifier la vaccination';
    document.getElementById('submitBtnText').textContent = 'Enregistrer';

    document.getElementById('vaccinationId').value = v.id;
    document.getElementById('animalId').value = v.animal_id || '';
    document.getElementById('veterinaireId').value = v.veterinaire_id || '';
    document.getElementById('medicamentId').value = v.medicament_id || '';
    document.getElementById('nomVaccin').value = v.nom_vaccin || '';
    document.getElementById('numeroLotVaccin').value = v.numero_lot_vaccin || '';
    document.getElementById('dateVaccination').value = v.date_vaccination || '';
    document.getElementById('dateProchainRappel').value = v.date_prochain_rappel || '';
    document.getElementById('observations').value = v.observations || '';
    document.getElementById('reaction').value = v.reaction || '';

    clearFormErrors();
    document.getElementById('vaccinationModal').classList.add('open');
}

function deleteVaccination(id) {
    const v = State.vaccinations.find(x => x.id === id);
    if (!v) return;

    const nom = v.nom_vaccin || `Vaccination #${v.id}`;

    showConfirm(
        `Voulez-vous vraiment supprimer la vaccination <strong>${escapeHtml(nom)}</strong> ?`,
        async () => {
            try {
                const response = await Api.delete(`/vaccinations/${id}`);
                Toast.success(response.message || 'Vaccination supprimée.');
                await loadVaccinations(State.pagination.current_page || 1);
                await checkRappelsRetard();
            } catch (error) {
                Toast.error(error.message);
            }
        }
    );
}

// ============================================================
// FORMULAIRE
// ============================================================

async function submitVaccinationForm(e) {
    e.preventDefault();
    clearFormErrors();

    const btn = document.getElementById('modalSubmitBtn');
    const originalText = document.getElementById('submitBtnText').textContent;
    btn.disabled = true;
    document.getElementById('submitBtnText').textContent = 'Enregistrement...';

    const data = {
        animal_id:          parseInt(document.getElementById('animalId').value, 10),
        veterinaire_id:     document.getElementById('veterinaireId').value
                             ? parseInt(document.getElementById('veterinaireId').value, 10)
                             : null,
        medicament_id:      document.getElementById('medicamentId').value
                             ? parseInt(document.getElementById('medicamentId').value, 10)
                             : null,
        nom_vaccin:         document.getElementById('nomVaccin').value.trim(),
        numero_lot_vaccin:  document.getElementById('numeroLotVaccin').value.trim() || null,
        date_vaccination:   document.getElementById('dateVaccination').value,
        date_prochain_rappel: document.getElementById('dateProchainRappel').value || null,
        observations:       document.getElementById('observations').value.trim() || null,
        reaction:           document.getElementById('reaction').value.trim() || null,
    };

    try {
        let response;
        if (State.editingId) {
            response = await Api.put(`/vaccinations/${State.editingId}`, data);
        } else {
            response = await Api.post('/vaccinations', data);
        }

        Toast.success(response.message);
        closeModal('vaccinationModal');
        await loadVaccinations(State.pagination.current_page || 1);
        await checkRappelsRetard();
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

    // Mode rappels à venir
    safe('showRappelsBtn', 'click', () => {
        State.modeRappels = true;
        State.modeRetard = false;
        loadVaccinations();
    });

    // Mode rappels en retard
    safe('showRetardBtn', 'click', () => {
        State.modeRetard = true;
        State.modeRappels = false;
        loadVaccinations();
    });

    safe('modalCloseBtn', 'click', () => closeModal('vaccinationModal'));
    safe('modalCancelBtn', 'click', () => closeModal('vaccinationModal'));
    safe('confirmCloseBtn', 'click', () => closeModal('confirmModal'));
    safe('confirmCancelBtn', 'click', () => closeModal('confirmModal'));

    safe('confirmOkBtn', 'click', async () => {
        if (confirmCallback) await confirmCallback();
        closeModal('confirmModal');
        confirmCallback = null;
    });

    safe('vaccinationForm', 'submit', submitVaccinationForm);

    // Filtres
    let searchTimeout;
    safe('searchInput', 'input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            State.filters.search = e.target.value.trim();
            State.modeRappels = false;
            State.modeRetard = false;
            loadVaccinations(1);
        }, 400);
    });

    safe('filterAnimal', 'change', (e) => {
        State.filters.animal_id = e.target.value;
        State.modeRappels = false;
        State.modeRetard = false;
        loadVaccinations(1);
    });

    safe('filterVeterinaire', 'change', (e) => {
        State.filters.veterinaire_id = e.target.value;
        State.modeRappels = false;
        State.modeRetard = false;
        loadVaccinations(1);
    });

    safe('filterRappel', 'change', (e) => {
        State.filters.rappel = e.target.value;
        State.modeRappels = false;
        State.modeRetard = false;
        loadVaccinations(1);
    });

    safe('resetFiltersBtn', 'click', () => {
        State.filters = { search: '', animal_id: '', veterinaire_id: '', rappel: '' };
        State.modeRappels = false;
        State.modeRetard = false;
        document.getElementById('searchInput').value = '';
        document.getElementById('filterAnimal').value = '';
        document.getElementById('filterVeterinaire').value = '';
        document.getElementById('filterRappel').value = '';
        loadVaccinations(1);
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
        medicament_id: 'medicamentId',
        nom_vaccin: 'nomVaccin',
        numero_lot_vaccin: 'numeroLotVaccin',
        date_vaccination: 'dateVaccination',
        date_prochain_rappel: 'dateProchainRappel',
        observations: 'observations',
        reaction: 'reaction',
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