/**
 * Logique de la page Achats (CRUD complet + lignes de commande).
 */

Guard.requireAuth();

// === État ===
const State = {
    achats: [],
    fournisseurs: [],
    medicaments: [],
    pagination: { current_page: 1, last_page: 1, per_page: 20, total: 0 },
    filters: {
        search:         '',
        fournisseur_id: '',
        statut:         '',
    },
    editingId: null,
    lignes: [], // Lignes de commande en cours d'édition
};

// === Init ===
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await Promise.all([loadFournisseurs(), loadMedicaments()]);
    } catch (e) {
        console.warn('[Achats] Erreur chargement listes', e);
    }

    try {
        await loadAchats();
    } catch (error) {
        console.error('[Achats] loadAchats a échoué', error);
    }

    setupEventListeners();
});

// ============================================================
// CHARGEMENT
// ============================================================

async function loadAchats(page = 1) {
    const tbody = document.getElementById('achatsTbody');
    tbody.innerHTML = `<tr><td colspan="7" class="empty"><div class="spinner" style="margin:20px auto;"></div></td></tr>`;

    try {
        const params = new URLSearchParams({ page, per_page: 20 });
        if (State.filters.search)         params.append('search', State.filters.search);
        if (State.filters.fournisseur_id) params.append('fournisseur_id', State.filters.fournisseur_id);
        if (State.filters.statut)         params.append('statut', State.filters.statut);

        const response = await Api.get(`/achats?${params}`);
        State.achats = response.data || [];
        State.pagination = response.meta || {};

        renderTable();
        renderPagination();
        updateStats();
    } catch (error) {
        const msg = error.status ? `[${error.status}] ${error.message}` : error.message;
        tbody.innerHTML = `<tr><td colspan="7" class="empty" style="color:var(--color-danger);padding:20px;text-align:center;">⚠️ ${escapeHtml(msg)}</td></tr>`;
        try { Toast.error(msg); } catch (e) {}
    }
}

async function loadFournisseurs() {
    try {
        const response = await Api.get('/fournisseurs?per_page=200&actif=true');
        State.fournisseurs = response.data || [];

        const filterSelect = document.getElementById('filterFournisseur');
        const formSelect   = document.getElementById('fournisseurId');

        State.fournisseurs.forEach(f => {
            const opt = document.createElement('option');
            opt.value = f.id;
            opt.textContent = f.nom;
            filterSelect.appendChild(opt.cloneNode(true));
            formSelect.appendChild(opt);
        });
    } catch (e) {
        console.warn('[Achats] loadFournisseurs a échoué', e);
    }
}

async function loadMedicaments() {
    try {
        const response = await Api.get('/medicaments?per_page=300&actif=true');
        State.medicaments = response.data || [];
    } catch (e) {
        console.warn('[Achats] loadMedicaments a échoué', e);
    }
}

// ============================================================
// STATS
// ============================================================

function updateStats() {
    let brouillon = 0, enCours = 0, livrees = 0, montant = 0;

    State.achats.forEach(a => {
        if (a.statut === 'brouillon') brouillon++;
        else if (a.statut === 'envoyee' || a.statut === 'partiellement_livree') enCours++;
        else if (a.statut === 'livree') livrees++;

        montant += parseFloat(a.montant_total_ttc || 0);
    });

    document.getElementById('statBrouillon').textContent = brouillon;
    document.getElementById('statEnCours').textContent   = enCours;
    document.getElementById('statLivrees').textContent   = livrees;
    document.getElementById('statMontant').textContent   = formatMoney(montant);
}

// ============================================================
// RENDU
// ============================================================

function renderTable() {
    const tbody = document.getElementById('achatsTbody');

    if (!State.achats.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty">
                    <div class="empty-state">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                        <p>Aucune commande trouvée</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    const statutLabels = {
        brouillon:             { label: 'Brouillon',   class: 'badge-neutral' },
        envoyee:               { label: 'Envoyée',     class: 'badge-info' },
        partiellement_livree:  { label: 'Partielle',   class: 'badge-warning' },
        livree:                { label: 'Livrée',      class: 'badge-success' },
        annulee:               { label: 'Annulée',     class: 'badge-danger' },
    };

    tbody.innerHTML = State.achats.map(a => {
        const st = statutLabels[a.statut] || { label: a.statut, class: 'badge-neutral' };
        const fournisseurNom = a.fournisseur?.nom || '—';

        return `
            <tr>
                <td><code>${escapeHtml(a.numero_commande)}</code></td>
                <td><strong>${escapeHtml(fournisseurNom)}</strong></td>
                <td>${a.date_commande ? formatDate(a.date_commande) : '—'}</td>
                <td>${a.date_livraison_prevue ? formatDate(a.date_livraison_prevue) : '—'}</td>
                <td class="text-right"><strong>${formatMoney(a.montant_total_ttc)}</strong></td>
                <td><span class="badge ${st.class}">${st.label}</span></td>
                <td class="text-right">
                    <button class="btn btn-ghost btn-icon" data-action="view" data-id="${a.id}" title="Détail">
                        <span data-icon="eye"></span>
                    </button>
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
    const tbody = document.getElementById('achatsTbody');
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
        case 'view':   viewAchat(id); break;
        case 'edit':   editAchat(id); break;
        case 'delete': deleteAchat(id); break;
    }
}

function renderPagination() {
    const container = document.getElementById('paginationContainer');
    const { current_page, last_page, total } = State.pagination;

    if (!last_page || last_page <= 1) {
        container.innerHTML = total ? `<div class="pagination-info">${total} commande${total > 1 ? 's' : ''}</div>` : '';
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
    html += `<div class="pagination-info">${total} commande${total > 1 ? 's' : ''} — page ${current_page} / ${last_page}</div>`;
    container.innerHTML = html;
}

function goToPage(page) {
    loadAchats(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================
// LIGNES DE COMMANDE
// ============================================================

function addLigne() {
    State.lignes.push({
        medicament_id: '',
        quantite_commandee: 1,
        prix_achat_ht_unitaire: 0,
    });
    renderLignes();
}

function removeLigne(index) {
    State.lignes.splice(index, 1);
    renderLignes();
}

function renderLignes() {
    const container = document.getElementById('lignesContainer');

    if (!State.lignes.length) {
        container.innerHTML = `<p class="empty">Aucune ligne. Cliquez sur "Ajouter une ligne".</p>`;
        return;
    }

    container.innerHTML = State.lignes.map((ligne, idx) => `
        <div class="ligne-row" data-index="${idx}">
            <div class="ligne-field ligne-field-med">
                <label>Médicament</label>
                <select data-field="medicament_id">
                    <option value="">— Choisir —</option>
                    ${State.medicaments.map(m =>
                        `<option value="${m.id}" ${m.id == ligne.medicament_id ? 'selected' : ''}>${escapeHtml(m.nom)}</option>`
                    ).join('')}
                </select>
            </div>

            <div class="ligne-field ligne-field-qte">
                <label>Quantité</label>
                <input type="number" min="1" value="${ligne.quantite_commandee}" data-field="quantite_commandee">
            </div>

            <div class="ligne-field ligne-field-prix">
                <label>Prix HT unitaire</label>
                <input type="number" min="0" step="0.01" value="${ligne.prix_achat_ht_unitaire}" data-field="prix_achat_ht_unitaire">
            </div>

            <div class="ligne-field ligne-field-action">
                <button type="button" class="btn btn-ghost btn-icon" onclick="removeLigne(${idx})" title="Supprimer">
                    <span data-icon="trash"></span>
                </button>
            </div>
        </div>
    `).join('');

    // Injecter les icônes
    container.querySelectorAll('[data-icon]').forEach(el => {
        const name = el.getAttribute('data-icon');
        if (Icons[name]) el.innerHTML = Icons[name];
    });

    // Attacher les listeners
    container.querySelectorAll('.ligne-row').forEach(row => {
        const index = parseInt(row.getAttribute('data-index'), 10);

        row.querySelectorAll('[data-field]').forEach(input => {
            input.addEventListener('change', (e) => {
                const field = e.target.getAttribute('data-field');
                let value = e.target.value;

                if (field === 'medicament_id') value = parseInt(value, 10) || '';
                else if (field === 'quantite_commandee') value = parseInt(value, 10) || 1;
                else if (field === 'prix_achat_ht_unitaire') value = parseFloat(value) || 0;

                State.lignes[index][field] = value;
            });
        });
    });
}

// ============================================================
// ACTIONS
// ============================================================

function openCreateModal() {
    State.editingId = null;
    State.lignes = [];
    document.getElementById('modalTitle').textContent = 'Nouvelle commande';
    document.getElementById('submitBtnText').textContent = 'Créer';
    document.getElementById('achatForm').reset();
    document.getElementById('dateCommande').value = new Date().toISOString().split('T')[0];
    document.getElementById('statut').value = 'brouillon';
    clearFormErrors();
    renderLignes();
    document.getElementById('achatModal').classList.add('open');
}

function editAchat(id) {
    const a = State.achats.find(x => x.id === id);
    if (!a) return;

    State.editingId = id;
    document.getElementById('modalTitle').textContent = 'Modifier la commande';
    document.getElementById('submitBtnText').textContent = 'Enregistrer';

    document.getElementById('achatId').value = a.id;
    document.getElementById('fournisseurId').value = a.fournisseur_id || '';
    document.getElementById('numeroCommande').value = a.numero_commande || '';
    document.getElementById('dateCommande').value = a.date_commande || '';
    document.getElementById('dateLivraisonPrevue').value = a.date_livraison_prevue || '';
    document.getElementById('statut').value = a.statut || 'brouillon';
    document.getElementById('notes').value = a.notes || '';

    // Charger les lignes si disponibles
    State.lignes = (a.lignes || []).map(l => ({
        medicament_id: l.medicament_id,
        quantite_commandee: l.quantite_commandee,
        prix_achat_ht_unitaire: parseFloat(l.prix_achat_ht_unitaire || 0),
    }));

    clearFormErrors();
    renderLignes();
    document.getElementById('achatModal').classList.add('open');
}

async function viewAchat(id) {
    const body = document.getElementById('detailBody');
    const numero = document.getElementById('detailNumero');

    body.innerHTML = '<div class="spinner" style="margin: 20px auto;"></div>';
    numero.textContent = '—';

    document.getElementById('detailModal').classList.add('open');

    try {
        const response = await Api.get(`/achats/${id}`);
        const achat = response.data;

        numero.textContent = achat.numero_commande || `#${achat.id}`;
        renderDetailAchat(achat);
    } catch (error) {
        body.innerHTML = `
            <p class="empty" style="color: var(--color-danger);">
                ⚠️ ${escapeHtml(error.message)}
            </p>
        `;
    }
}


function renderDetailAchat(achat) {
    const statutLabels = {
        brouillon:            { label: 'Brouillon',  class: 'badge-neutral' },
        envoyee:              { label: 'Envoyée',    class: 'badge-info' },
        partiellement_livree: { label: 'Partielle',  class: 'badge-warning' },
        livree:               { label: 'Livrée',     class: 'badge-success' },
        annulee:              { label: 'Annulée',    class: 'badge-danger' },
    };
    const st = statutLabels[achat.statut] || { label: achat.statut, class: 'badge-neutral' };

    const lignes = achat.lignes || [];

    const lignesHtml = lignes.length
        ? lignes.map(l => {
            const medicamentNom = l.medicament?.nom || '—';
            const qteRecue = l.quantite_recue ?? 0;
            const qteCmd = l.quantite_commandee ?? 0;

            let qteBadge = 'badge-neutral';
            if (qteRecue >= qteCmd) qteBadge = 'badge-success';
            else if (qteRecue > 0) qteBadge = 'badge-warning';

            return `
                <tr>
                    <td><strong>${escapeHtml(medicamentNom)}</strong></td>
                    <td class="text-right">${qteCmd}</td>
                    <td class="text-right"><span class="badge ${qteBadge}">${qteRecue}</span></td>
                    <td class="text-right">${formatMoney(l.prix_achat_ht_unitaire)}</td>
                    <td class="text-right">${formatMoney(l.montant_ht)}</td>
                </tr>
            `;
        }).join('')
        : '<tr><td colspan="5" class="empty">Aucune ligne</td></tr>';

    document.getElementById('detailBody').innerHTML = `
        <!-- Informations générales -->
        <div class="detail-grid" style="margin-bottom: 24px;">
            <div class="detail-item">
                <span class="detail-label">N° commande</span>
                <span class="detail-value"><code>${escapeHtml(achat.numero_commande || '—')}</code></span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Statut</span>
                <span class="detail-value"><span class="badge ${st.class}">${st.label}</span></span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Fournisseur</span>
                <span class="detail-value">${escapeHtml(achat.fournisseur?.nom || '—')}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Date de commande</span>
                <span class="detail-value">${achat.date_commande ? formatDate(achat.date_commande) : '—'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Livraison prévue</span>
                <span class="detail-value">${achat.date_livraison_prevue ? formatDate(achat.date_livraison_prevue) : '—'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Créée par</span>
                <span class="detail-value">
                    ${achat.utilisateur
                        ? escapeHtml(`${achat.utilisateur.prenom || ''} ${achat.utilisateur.nom || ''}`.trim())
                        : '—'}
                </span>
            </div>
            ${achat.notes ? `
                <div class="detail-item full-width">
                    <span class="detail-label">Notes</span>
                    <span class="detail-value">${escapeHtml(achat.notes)}</span>
                </div>
            ` : ''}
        </div>

        <!-- Lignes de commande -->
        <h4 style="font-size: 0.95rem; font-weight: 600; margin-bottom: 12px; color: #1f2937;">
            Lignes de commande
            <span class="badge badge-neutral" style="margin-left: 8px;">${lignes.length}</span>
        </h4>

        <div class="table-wrapper" style="border: 1px solid var(--color-border); border-radius: 8px;">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Médicament</th>
                        <th class="text-right">Qté cmd</th>
                        <th class="text-right">Qté reçue</th>
                        <th class="text-right">Prix HT</th>
                        <th class="text-right">Montant HT</th>
                    </tr>
                </thead>
                <tbody>${lignesHtml}</tbody>
                <tfoot>
                    <tr>
                        <td colspan="4" class="text-right"><strong>Total HT :</strong></td>
                        <td class="text-right"><strong>${formatMoney(achat.montant_total_ht)}</strong></td>
                    </tr>
                    <tr>
                        <td colspan="4" class="text-right">TVA :</td>
                        <td class="text-right">${formatMoney(achat.montant_total_tva)}</td>
                    </tr>
                    <tr>
                        <td colspan="4" class="text-right"><strong>Total TTC :</strong></td>
                        <td class="text-right"><strong>${formatMoney(achat.montant_total_ttc)}</strong></td>
                    </tr>
                </tfoot>
            </table>
        </div>

        ${(achat.receptions && achat.receptions.length) ? `
            <h4 style="font-size: 0.95rem; font-weight: 600; margin: 24px 0 12px; color: #1f2937;">
                Réceptions liées
                <span class="badge badge-info" style="margin-left: 8px;">${achat.receptions.length}</span>
            </h4>
            <div class="table-wrapper" style="border: 1px solid var(--color-border); border-radius: 8px;">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>N° réception</th>
                            <th>Date</th>
                            <th>Bon de livraison</th>
                            <th class="text-right">Montant TTC</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${achat.receptions.map(r => `
                            <tr>
                                <td><code>${escapeHtml(r.numero_reception)}</code></td>
                                <td>${r.date_reception ? formatDate(r.date_reception) : '—'}</td>
                                <td>${escapeHtml(r.numero_bon_livraison || '—')}</td>
                                <td class="text-right">${formatMoney(r.montant_total_ttc)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        ` : ''}
    `;

    // Bouton "Modifier" dans le footer du modal de détail
    const editBtn = document.getElementById('detailEditBtn');
    editBtn.onclick = () => {
        closeModal('detailModal');
        editAchat(achat.id);
    };
}


function deleteAchat(id) {
    const a = State.achats.find(x => x.id === id);
    if (!a) return;

    showConfirm(
        `Voulez-vous vraiment supprimer la commande <strong>${escapeHtml(a.numero_commande)}</strong> ?`,
        async () => {
            try {
                const response = await Api.delete(`/achats/${id}`);
                Toast.success(response.message || 'Commande supprimée.');
                await loadAchats(State.pagination.current_page || 1);
            } catch (error) {
                Toast.error(error.message);
            }
        }
    );
}

// ============================================================
// FORMULAIRE
// ============================================================

async function submitAchatForm(e) {
    e.preventDefault();
    clearFormErrors();

    const btn = document.getElementById('modalSubmitBtn');
    btn.disabled = true;
    document.getElementById('submitBtnText').textContent = 'Enregistrement...';

    // Calculer les totaux
    let totalHt = 0;
    State.lignes.forEach(l => {
        totalHt += (l.quantite_commandee || 0) * (l.prix_achat_ht_unitaire || 0);
    });

    const data = {
        fournisseur_id:         parseInt(document.getElementById('fournisseurId').value, 10),
        numero_commande:        document.getElementById('numeroCommande').value.trim(),
        date_commande:          document.getElementById('dateCommande').value,
        date_livraison_prevue:  document.getElementById('dateLivraisonPrevue').value || null,
        statut:                 document.getElementById('statut').value,
        notes:                  document.getElementById('notes').value.trim() || null,
        montant_total_ht:       totalHt,
        montant_total_tva:      0,
        montant_total_ttc:      totalHt,
        lignes: State.lignes.filter(l => l.medicament_id && l.quantite_commandee > 0),
    };

    try {
        let response;
        if (State.editingId) {
            response = await Api.put(`/achats/${State.editingId}`, data);
        } else {
            response = await Api.post('/achats', data);
        }

        Toast.success(response.message);
        closeModal('achatModal');
        await loadAchats(State.pagination.current_page || 1);
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
        document.getElementById('submitBtnText').textContent = State.editingId ? 'Enregistrer' : 'Créer';
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
    safe('addLigneBtn', 'click', addLigne);

    safe('modalCloseBtn', 'click', () => closeModal('achatModal'));
    safe('modalCancelBtn', 'click', () => closeModal('achatModal'));
    safe('confirmCloseBtn', 'click', () => closeModal('confirmModal'));
    safe('confirmCancelBtn', 'click', () => closeModal('confirmModal'));
    safe('detailCloseBtn', 'click', () => closeModal('detailModal'));
    safe('detailCloseBtn2', 'click', () => closeModal('detailModal'));
    safe('confirmOkBtn', 'click', async () => {
        if (confirmCallback) await confirmCallback();
        closeModal('confirmModal');
        confirmCallback = null;
    });

    safe('achatForm', 'submit', submitAchatForm);

    // Filtres
    let searchTimeout;
    safe('searchInput', 'input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            State.filters.search = e.target.value.trim();
            loadAchats(1);
        }, 400);
    });

    safe('filterFournisseur', 'change', (e) => {
        State.filters.fournisseur_id = e.target.value;
        loadAchats(1);
    });

    safe('filterStatut', 'change', (e) => {
        State.filters.statut = e.target.value;
        loadAchats(1);
    });

    safe('resetFiltersBtn', 'click', () => {
        State.filters = { search: '', fournisseur_id: '', statut: '' };
        document.getElementById('searchInput').value = '';
        document.getElementById('filterFournisseur').value = '';
        document.getElementById('filterStatut').value = '';
        loadAchats(1);
    });

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
        fournisseur_id: 'fournisseurId',
        numero_commande: 'numeroCommande',
        date_commande: 'dateCommande',
        date_livraison_prevue: 'dateLivraisonPrevue',
        statut: 'statut',
        notes: 'notes',
    };
    return map[field] || field;
}

function formatDate(isoString) {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatMoney(value) {
    return new Intl.NumberFormat('fr-BI', {
        style: 'currency', currency: 'BIF',
        minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(value || 0);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}