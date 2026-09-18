/**
 * Logique de la page Médicaments (CRUD complet).
 *
 * ⚠️ Le layout (sidebar, header, footer) est géré par components.js + layout.js
 * Ce fichier ne contient QUE la logique du contenu (tableau, modals, filtres).
 */

// === 1. Protéger la page ===
Guard.requireAuth();

// === 2. État de la page ===
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

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadCategories();
        await loadMedicaments();
    } catch (error) {
        // Log pour débogage, mais ne pas arrêter l'initialisation
        console.error('Erreur lors du chargement des données:', error);
    }
    // Toujours initialiser les écouteurs même si le chargement a échoué
    setupEventListeners();
});

// ============================================================
// CHARGEMENT DES DONNÉES
// ============================================================

async function loadMedicaments(page = 1) {
    const tbody = document.getElementById('medicamentsTbody');
    tbody.innerHTML = `<tr><td colspan="8" class="empty"><div class="spinner" style="margin:20px auto;"></div></td></tr>`;

    try {
        const params = new URLSearchParams({
            page,
            per_page: 20,
            with_stock: true,
        });

        if (State.filters.search)         params.append('search', State.filters.search);
        if (State.filters.categorie)      params.append('categorie', State.filters.categorie);
        if (State.filters.sur_ordonnance) params.append('sur_ordonnance', State.filters.sur_ordonnance);
        if (State.filters.actif)          params.append('actif', State.filters.actif);

        const response = await Api.get(`/medicaments?${params}`);

        State.medicaments = response.data || [];
        State.pagination = response.meta || {};

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
        // Silencieux
    }
}

// ============================================================
// RENDU
// ============================================================

function renderTable() {
    const tbody = document.getElementById('medicamentsTbody');

    if (!State.medicaments.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty">
                    <div class="empty-state">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>
                        <p>Aucun médicament trouvé</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = State.medicaments.map(m => {
        const stock = m.stock_disponible ?? 0;
        const seuil = m.seuil_alerte ?? 0;
        let stockClass = 'badge-success';
        let stockLabel = stock;
        if (stock === 0) { stockClass = 'badge-danger'; stockLabel = 'Rupture'; }
        else if (stock <= seuil) { stockClass = 'badge-warning'; }

        return `
            <tr>
                <td><code>${escapeHtml(m.code_cip)}</code></td>
                <td>
                    <strong>${escapeHtml(m.nom)}</strong>
                    ${m.denomination_commune ? `<br><small class="text-muted">${escapeHtml(m.denomination_commune)}</small>` : ''}
                </td>
                <td>${m.categorie ? `<span class="badge badge-neutral">${escapeHtml(m.categorie)}</span>` : '—'}</td>
                <td class="text-right"><strong>${formatMoney(m.prix_vente_ttc_reference)}</strong></td>
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
                    <button class="btn btn-ghost btn-icon" onclick="viewMedicament(${m.id})" title="Voir">
                        <span data-icon="eye"></span>
                    </button>
                    <button class="btn btn-ghost btn-icon" onclick="toggleActif(${m.id})" title="${m.actif ? 'Désactiver' : 'Activer'}">
                        <span data-icon="power"></span>
                    </button>
                    <button class="btn btn-ghost btn-icon" onclick="editMedicament(${m.id})" title="Modifier">
                        <span data-icon="edit"></span>
                    </button>
                    <button class="btn btn-ghost btn-icon" onclick="deleteMedicament(${m.id}, '${escapeHtml(m.nom).replace(/'/g, "\\'")}')" title="Supprimer">
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
}

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

function goToPage(page) {
    loadMedicaments(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================
// ACTIONS
// ============================================================

function openCreateModal() {
    State.editingId = null;
    document.getElementById('modalTitle').textContent = 'Nouveau médicament';
    document.getElementById('submitBtnText').textContent = 'Créer';
    document.getElementById('medicamentForm').reset();
    document.getElementById('actif').checked = true;
    clearFormErrors();
    document.getElementById('medicamentModal').classList.add('open');
}

function editMedicament(id) {
    const m = State.medicaments.find(x => x.id === id);
    if (!m) return;

    State.editingId = id;
    document.getElementById('modalTitle').textContent = 'Modifier le médicament';
    document.getElementById('submitBtnText').textContent = 'Enregistrer';

    document.getElementById('medicamentId').value = m.id;
    document.getElementById('codeCip').value = m.code_cip || '';
    document.getElementById('codeBarre').value = m.code_barre || '';
    document.getElementById('nom').value = m.nom || '';
    document.getElementById('denominationCommune').value = m.denomination_commune || '';
    document.getElementById('laboratoire').value = m.laboratoire || '';
    document.getElementById('forme').value = m.forme || '';
    document.getElementById('dosage').value = m.dosage || '';
    document.getElementById('categorie').value = m.categorie || '';
    document.getElementById('voieAdministration').value = m.voie_administration || '';
    document.getElementById('prixVente').value = m.prix_vente_ttc_reference || '';
    document.getElementById('tauxTva').value = m.taux_tva || 0;
    document.getElementById('seuilAlerte').value = m.seuil_alerte || 10;
    document.getElementById('stockMax').value = m.stock_max || '';
    document.getElementById('delaiAttente').value = m.delai_attente || '';
    document.getElementById('posologie').value = m.posologie || '';
    document.getElementById('surOrdonnance').checked = !!m.sur_ordonnance;
    document.getElementById('usagePreventif').checked = !!m.usage_preventif;
    document.getElementById('actif').checked = !!m.actif;

    clearFormErrors();
    document.getElementById('medicamentModal').classList.add('open');
}

function viewMedicament(id) {
    window.location.href = `medicament-detail.html?id=${id}`;
}

async function toggleActif(id) {
    try {
        const response = await Api.post(`/medicaments/${id}/toggle-actif`);
        Toast.success(response.message);
        await loadMedicaments(State.pagination.current_page || 1);
    } catch (error) {
        Toast.error(error.message);
    }
}

function deleteMedicament(id, nom) {
    showConfirm(
        `Voulez-vous vraiment supprimer <strong>${escapeHtml(nom)}</strong> ?<br><small>Le médicament sera marqué comme supprimé (soft delete).</small>`,
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
// FORMULAIRE
// ============================================================

async function submitMedicamentForm(e) {
    e.preventDefault();
    clearFormErrors();

    const btn = document.getElementById('modalSubmitBtn');
    const originalText = document.getElementById('submitBtnText').textContent;
    btn.disabled = true;
    document.getElementById('submitBtnText').textContent = 'Enregistrement...';

    const data = {
        code_cip:                 document.getElementById('codeCip').value.trim(),
        code_barre:               document.getElementById('codeBarre').value.trim() || null,
        nom:                      document.getElementById('nom').value.trim(),
        denomination_commune:     document.getElementById('denominationCommune').value.trim() || null,
        laboratoire:              document.getElementById('laboratoire').value.trim() || null,
        forme:                    document.getElementById('forme').value.trim() || null,
        dosage:                   document.getElementById('dosage').value.trim() || null,
        categorie:                document.getElementById('categorie').value.trim() || null,
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
    document.getElementById('addBtn').addEventListener('click', openCreateModal);

    document.getElementById('modalCloseBtn').addEventListener('click', () => closeModal('medicamentModal'));
    document.getElementById('modalCancelBtn').addEventListener('click', () => closeModal('medicamentModal'));
    document.getElementById('confirmCloseBtn').addEventListener('click', () => closeModal('confirmModal'));
    document.getElementById('confirmCancelBtn').addEventListener('click', () => closeModal('confirmModal'));

    document.getElementById('confirmOkBtn').addEventListener('click', async () => {
        if (confirmCallback) await confirmCallback();
        closeModal('confirmModal');
        confirmCallback = null;
    });

    document.getElementById('medicamentForm').addEventListener('submit', submitMedicamentForm);

    // Filtres
    let searchTimeout;
    document.getElementById('searchInput').addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            State.filters.search = e.target.value.trim();
            loadMedicaments(1);
        }, 400);
    });

    document.getElementById('filterCategorie').addEventListener('change', (e) => {
        State.filters.categorie = e.target.value;
        loadMedicaments(1);
    });

    document.getElementById('filterOrdonnance').addEventListener('change', (e) => {
        State.filters.sur_ordonnance = e.target.value;
        loadMedicaments(1);
    });

    document.getElementById('filterActif').addEventListener('change', (e) => {
        State.filters.actif = e.target.value;
        loadMedicaments(1);
    });

    document.getElementById('resetFiltersBtn').addEventListener('click', () => {
        State.filters = { search: '', categorie: '', sur_ordonnance: '', actif: '' };
        document.getElementById('searchInput').value = '';
        document.getElementById('filterCategorie').value = '';
        document.getElementById('filterOrdonnance').value = '';
        document.getElementById('filterActif').value = '';
        loadMedicaments(1);
    });

    // Fermer modal si clic sur overlay
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('open');
            }
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
        code_cip: 'codeCip',
        code_barre: 'codeBarre',
        nom: 'nom',
        prix_vente_ttc_reference: 'prixVente',
    };
    return map[field] || field;
}

function formatMoney(value) {
    return new Intl.NumberFormat('fr-BI', {
        style: 'currency',
        currency: 'BIF',
        minimumFractionDigits: 0,
    }).format(value || 0);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}


