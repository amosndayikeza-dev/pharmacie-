/**
 * Logique de la page Réceptions.
 */

Guard.requireAuth();

// === État ===
const State = {
    receptions: [],
    fournisseurs: [],
    achats: [],
    medicaments: [],
    pagination: { current_page: 1, last_page: 1, per_page: 20, total: 0 },
    filters: {
        search:         '',
        fournisseur_id: '',
        statut:         '',
    },
    editingId: null,
    lignes: [],
};

// === Init ===
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await Promise.all([loadFournisseurs(), loadAchats(), loadMedicaments()]);
    } catch (e) {
        console.warn('[Receptions] Erreur chargement listes', e);
    }

    try {
        await loadReceptions();
    } catch (error) {
        console.error('[Receptions] loadReceptions a échoué', error);
    }

    setupEventListeners();
});

// ============================================================
// CHARGEMENT
// ============================================================

async function loadReceptions(page = 1) {
    const tbody = document.getElementById('receptionsTbody');
    tbody.innerHTML = `<tr><td colspan="7" class="empty"><div class="spinner" style="margin:20px auto;"></div></td></tr>`;

    try {
        const params = new URLSearchParams({ page, per_page: 20 });
        if (State.filters.search)         params.append('search', State.filters.search);
        if (State.filters.fournisseur_id) params.append('fournisseur_id', State.filters.fournisseur_id);
        if (State.filters.statut)         params.append('statut', State.filters.statut);

        const response = await Api.get(`/receptions?${params}`);
        State.receptions = response.data || [];
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
    } catch (e) { console.warn('loadFournisseurs', e); }
}

async function loadAchats() {
    try {
        const response = await Api.get('/achats?per_page=100');
        State.achats = response.data || [];

        const select = document.getElementById('achatId');
        State.achats.forEach(a => {
            const opt = document.createElement('option');
            opt.value = a.id;
            opt.textContent = `${a.numero_commande} — ${a.fournisseur?.nom || ''}`;
            select.appendChild(opt);
        });

        // Listener : quand on choisit une commande → pré-remplir
        select.addEventListener('change', onAchatSelected);
    } catch (e) { console.warn('loadAchats', e); }
}

async function loadMedicaments() {
    try {
        const response = await Api.get('/medicaments?per_page=300&actif=true');
        State.medicaments = response.data || [];
    } catch (e) { console.warn('loadMedicaments', e); }
}

// ============================================================
// PRÉ-REMPLISSAGE DEPUIS UNE COMMANDE
// ============================================================

async function onAchatSelected(e) {
    const achatId = parseInt(e.target.value, 10);
    if (!achatId) {
        State.lignes = [];
        renderLignes();
        return;
    }

    try {
        const response = await Api.get(`/achats/${achatId}`);
        const achat = response.data;

        // Remplir le fournisseur
        document.getElementById('fournisseurId').value = achat.fournisseur_id || '';

        // Pré-remplir les lignes avec ce qui reste à recevoir
        State.lignes = (achat.lignes || [])
            .filter(l => (l.quantite_recue || 0) < l.quantite_commandee)
            .map(l => ({
                medicament_id:          l.medicament_id,
                numero_lot:             '',
                date_peremption:        '',
                date_fabrication:       '',
                quantite_recue:         l.quantite_commandee - (l.quantite_recue || 0),
                prix_achat_ht_unitaire: parseFloat(l.prix_achat_ht_unitaire || 0),
                taux_tva:               parseFloat(l.taux_tva || 0),
            }));

        renderLignes();
        Toast.info('Lignes pré-remplies depuis la commande.');
    } catch (error) {
        Toast.error(error.message);
    }
}

// ============================================================
// STATS
// ============================================================

function updateStats() {
    let brouillon = 0, validees = 0, montant = 0, mois = 0;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    State.receptions.forEach(r => {
        if (r.statut === 'brouillon') brouillon++;
        else if (r.statut === 'validee') {
            validees++;
            const d = new Date(r.date_reception);
            if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) mois++;
        }
        montant += parseFloat(r.montant_total_ttc || 0);
    });

    document.getElementById('statBrouillon').textContent = brouillon;
    document.getElementById('statValidees').textContent  = validees;
    document.getElementById('statMontant').textContent   = formatMoney(montant);
    document.getElementById('statMois').textContent      = mois;
}

// ============================================================
// RENDU
// ============================================================

function renderTable() {
    const tbody = document.getElementById('receptionsTbody');

    if (!State.receptions.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty">
                    <div class="empty-state">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>
                        <p>Aucune réception trouvée</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    const statutLabels = {
        brouillon: { label: 'Brouillon', class: 'badge-neutral' },
        validee:   { label: 'Validée',   class: 'badge-success' },
        annulee:   { label: 'Annulée',   class: 'badge-danger' },
    };

    tbody.innerHTML = State.receptions.map(r => {
        const st = statutLabels[r.statut] || { label: r.statut, class: 'badge-neutral' };

        // Boutons selon statut
        let actionsHtml = `
            <button class="btn btn-ghost btn-icon" data-action="view" data-id="${r.id}" title="Détail">
                <span data-icon="eye"></span>
            </button>
        `;

        if (r.statut === 'brouillon') {
            actionsHtml += `
                <button class="btn btn-ghost btn-icon" data-action="valider" data-id="${r.id}" title="Valider (crée les lots)">
                    <span data-icon="check"></span>
                </button>
                <button class="btn btn-ghost btn-icon" data-action="edit" data-id="${r.id}" title="Modifier">
                    <span data-icon="edit"></span>
                </button>
                <button class="btn btn-ghost btn-icon" data-action="delete" data-id="${r.id}" title="Supprimer">
                    <span data-icon="trash"></span>
                </button>
            `;
        }

        return `
            <tr>
                <td><code>${escapeHtml(r.numero_reception)}</code></td>
                <td><strong>${escapeHtml(r.fournisseur?.nom || '—')}</strong></td>
                <td>${r.date_reception ? formatDate(r.date_reception) : '—'}</td>
                <td>${escapeHtml(r.numero_bon_livraison || '—')}</td>
                <td class="text-right"><strong>${formatMoney(r.montant_total_ttc)}</strong></td>
                <td><span class="badge ${st.class}">${st.label}</span></td>
                <td class="text-right">${actionsHtml}</td>
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
    const tbody = document.getElementById('receptionsTbody');
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
        case 'view':    viewReception(id); break;
        case 'edit':    editReception(id); break;
        case 'valider': validerReception(id); break;
        case 'delete':  deleteReception(id); break;
    }
}

function renderPagination() {
    const container = document.getElementById('paginationContainer');
    const { current_page, last_page, total } = State.pagination;

    if (!last_page || last_page <= 1) {
        container.innerHTML = total ? `<div class="pagination-info">${total} réception${total > 1 ? 's' : ''}</div>` : '';
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
    html += `<div class="pagination-info">${total} réception${total > 1 ? 's' : ''} — page ${current_page} / ${last_page}</div>`;
    container.innerHTML = html;
}

function goToPage(page) {
    loadReceptions(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================
// LIGNES DE RÉCEPTION
// ============================================================

function addLigne() {
    State.lignes.push({
        medicament_id:          '',
        numero_lot:             '',
        date_peremption:        '',
        date_fabrication:       '',
        quantite_recue:         1,
        prix_achat_ht_unitaire: 0,
        taux_tva:               0,
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
        <div class="ligne-row-reception" data-index="${idx}">
            <div class="ligne-field full">
                <label>Médicament</label>
                <select data-field="medicament_id">
                    <option value="">— Choisir —</option>
                    ${State.medicaments.map(m =>
                        `<option value="${m.id}" ${m.id == ligne.medicament_id ? 'selected' : ''}>${escapeHtml(m.nom)}</option>`
                    ).join('')}
                </select>
            </div>

            <div class="ligne-field">
                <label>N° lot</label>
                <input type="text" maxlength="100" value="${escapeHtml(ligne.numero_lot)}" data-field="numero_lot" placeholder="LOT-2026-001">
            </div>

            <div class="ligne-field">
                <label>Péremption</label>
                <input type="date" value="${ligne.date_peremption}" data-field="date_peremption">
            </div>

            <div class="ligne-field">
                <label>Fabrication</label>
                <input type="date" value="${ligne.date_fabrication}" data-field="date_fabrication">
            </div>

            <div class="ligne-field">
                <label>Qté reçue</label>
                <input type="number" min="1" value="${ligne.quantite_recue}" data-field="quantite_recue">
            </div>

            <div class="ligne-field">
                <label>Prix HT</label>
                <input type="number" min="0" step="0.01" value="${ligne.prix_achat_ht_unitaire}" data-field="prix_achat_ht_unitaire">
            </div>

            <div class="ligne-field">
                <label>TVA %</label>
                <input type="number" min="0" max="100" step="0.01" value="${ligne.taux_tva}" data-field="taux_tva">
            </div>

            <div class="ligne-field action">
                <button type="button" class="btn btn-ghost btn-icon" onclick="removeLigne(${idx})" title="Supprimer">
                    <span data-icon="trash"></span>
                </button>
            </div>
        </div>
    `).join('');

    container.querySelectorAll('[data-icon]').forEach(el => {
        const name = el.getAttribute('data-icon');
        if (Icons[name]) el.innerHTML = Icons[name];
    });

    container.querySelectorAll('.ligne-row-reception').forEach(row => {
        const index = parseInt(row.getAttribute('data-index'), 10);

        row.querySelectorAll('[data-field]').forEach(input => {
            input.addEventListener('change', (e) => {
                const field = e.target.getAttribute('data-field');
                let value = e.target.value;

                if (field === 'medicament_id') value = parseInt(value, 10) || '';
                else if (field === 'quantite_recue') value = parseInt(value, 10) || 1;
                else if (['prix_achat_ht_unitaire', 'taux_tva'].includes(field)) value = parseFloat(value) || 0;

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
    document.getElementById('modalTitle').textContent = 'Nouvelle réception';
    document.getElementById('submitBtnText').textContent = 'Créer';
    document.getElementById('receptionForm').reset();
    document.getElementById('dateReception').value = new Date().toISOString().split('T')[0];
    clearFormErrors();
    renderLignes();
    document.getElementById('receptionModal').classList.add('open');
}

function editReception(id) {
    const r = State.receptions.find(x => x.id === id);
    if (!r) return;

    if (r.statut !== 'brouillon') {
        Toast.warning('Une réception validée ne peut plus être modifiée.');
        return;
    }

    State.editingId = id;
    document.getElementById('modalTitle').textContent = 'Modifier la réception';
    document.getElementById('submitBtnText').textContent = 'Enregistrer';

    document.getElementById('receptionId').value = r.id;
    document.getElementById('achatId').value = r.achat_id || '';
    document.getElementById('fournisseurId').value = r.fournisseur_id || '';
    document.getElementById('numeroReception').value = r.numero_reception || '';
    document.getElementById('dateReception').value = r.date_reception || '';
    document.getElementById('numeroBonLivraison').value = r.numero_bon_livraison || '';
    document.getElementById('observations').value = r.observations || '';

    State.lignes = (r.lignes || []).map(l => ({
        medicament_id:          l.medicament_id,
        numero_lot:             l.numero_lot || '',
        date_peremption:        l.date_peremption || '',
        date_fabrication:       l.date_fabrication || '',
        quantite_recue:         l.quantite_recue,
        prix_achat_ht_unitaire: parseFloat(l.prix_achat_ht_unitaire || 0),
        taux_tva:               parseFloat(l.taux_tva || 0),
    }));

    clearFormErrors();
    renderLignes();
    document.getElementById('receptionModal').classList.add('open');
}

async function viewReception(id) {
    const body = document.getElementById('detailBody');
    const numero = document.getElementById('detailNumero');

    body.innerHTML = '<div class="spinner" style="margin: 20px auto;"></div>';
    numero.textContent = '—';
    document.getElementById('detailModal').classList.add('open');

    try {
        const response = await Api.get(`/receptions/${id}`);
        const r = response.data;
        numero.textContent = r.numero_reception || `#${r.id}`;

        const statutLabels = {
            brouillon: { label: 'Brouillon', class: 'badge-neutral' },
            validee:   { label: 'Validée',   class: 'badge-success' },
            annulee:   { label: 'Annulée',   class: 'badge-danger' },
        };
        const st = statutLabels[r.statut] || { label: r.statut, class: 'badge-neutral' };
        const lignes = r.lignes || [];

        body.innerHTML = `
            <div class="detail-grid" style="margin-bottom: 24px;">
                <div class="detail-item">
                    <span class="detail-label">N° réception</span>
                    <span class="detail-value"><code>${escapeHtml(r.numero_reception)}</code></span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Statut</span>
                    <span class="detail-value"><span class="badge ${st.class}">${st.label}</span></span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Fournisseur</span>
                    <span class="detail-value">${escapeHtml(r.fournisseur?.nom || '—')}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Date réception</span>
                    <span class="detail-value">${r.date_reception ? formatDate(r.date_reception) : '—'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Bon de livraison</span>
                    <span class="detail-value">${escapeHtml(r.numero_bon_livraison || '—')}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Commande liée</span>
                    <span class="detail-value">${r.achat?.numero_commande || '—'}</span>
                </div>
                ${r.observations ? `
                    <div class="detail-item full-width">
                        <span class="detail-label">Observations</span>
                        <span class="detail-value">${escapeHtml(r.observations)}</span>
                    </div>
                ` : ''}
            </div>

            <h4 style="font-size: 0.95rem; font-weight: 600; margin-bottom: 12px;">
                Lignes de réception
                <span class="badge badge-neutral" style="margin-left: 8px;">${lignes.length}</span>
            </h4>

            <div class="table-wrapper" style="border: 1px solid var(--color-border); border-radius: 8px;">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Médicament</th>
                            <th>N° lot</th>
                            <th>Péremption</th>
                            <th class="text-right">Qté reçue</th>
                            <th class="text-right">Prix HT</th>
                            <th class="text-right">Montant HT</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${lignes.length
                            ? lignes.map(l => `
                                <tr>
                                    <td><strong>${escapeHtml(l.medicament?.nom || '—')}</strong></td>
                                    <td><code>${escapeHtml(l.numero_lot || '—')}</code></td>
                                    <td>${l.date_peremption ? formatDate(l.date_peremption) : '—'}</td>
                                    <td class="text-right">${l.quantite_recue}</td>
                                    <td class="text-right">${formatMoney(l.prix_achat_ht_unitaire)}</td>
                                    <td class="text-right">${formatMoney(l.montant_ht)}</td>
                                </tr>
                            `).join('')
                            : '<tr><td colspan="6" class="empty">Aucune ligne</td></tr>'}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="5" class="text-right"><strong>Total HT :</strong></td>
                            <td class="text-right"><strong>${formatMoney(r.montant_total_ht)}</strong></td>
                        </tr>
                        <tr>
                            <td colspan="5" class="text-right">TVA :</td>
                            <td class="text-right">${formatMoney(r.montant_total_tva)}</td>
                        </tr>
                        <tr>
                            <td colspan="5" class="text-right"><strong>Total TTC :</strong></td>
                            <td class="text-right"><strong>${formatMoney(r.montant_total_ttc)}</strong></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        `;

        const editBtn = document.getElementById('detailEditBtn');
        editBtn.style.display = r.statut === 'brouillon' ? 'inline-flex' : 'none';
        editBtn.onclick = () => {
            closeModal('detailModal');
            editReception(r.id);
        };
    } catch (error) {
        body.innerHTML = `<p class="empty" style="color: var(--color-danger);">⚠️ ${escapeHtml(error.message)}</p>`;
    }
}

function validerReception(id) {
    const r = State.receptions.find(x => x.id === id);
    if (!r) return;

    showConfirm(
        `Valider la réception <strong>${escapeHtml(r.numero_reception)}</strong> ?<br><br>
        <span style="color: var(--color-warning); font-weight: 600;">
            ⚠️ Cette action va créer les lots physiques et augmenter le stock.
            Elle est <strong>irréversible</strong>.
        </span>`,
        async () => {
            try {
                const response = await Api.post(`/receptions/${id}/valider`);
                Toast.success(response.message || 'Réception validée. Stock mis à jour.');
                await loadReceptions(State.pagination.current_page || 1);
            } catch (error) {
                Toast.error(error.message);
            }
        }
    );
}

function deleteReception(id) {
    const r = State.receptions.find(x => x.id === id);
    if (!r) return;

    if (r.statut !== 'brouillon') {
        Toast.warning('Une réception validée ne peut plus être supprimée.');
        return;
    }

    showConfirm(
        `Voulez-vous vraiment supprimer la réception <strong>${escapeHtml(r.numero_reception)}</strong> ?`,
        async () => {
            try {
                const response = await Api.delete(`/receptions/${id}`);
                Toast.success(response.message || 'Réception supprimée.');
                await loadReceptions(State.pagination.current_page || 1);
            } catch (error) {
                Toast.error(error.message);
            }
        }
    );
}

// ============================================================
// FORMULAIRE
// ============================================================

async function submitReceptionForm(e) {
    e.preventDefault();
    clearFormErrors();

    const btn = document.getElementById('modalSubmitBtn');
    btn.disabled = true;
    document.getElementById('submitBtnText').textContent = 'Enregistrement...';

    // Calculer les totaux
    let totalHt = 0, totalTva = 0;
    State.lignes.forEach(l => {
        const ht  = (l.quantite_recue || 0) * (l.prix_achat_ht_unitaire || 0);
        const tva = ht * ((l.taux_tva || 0) / 100);
        totalHt  += ht;
        totalTva += tva;
    });

    const data = {
        achat_id:            document.getElementById('achatId').value
                                ? parseInt(document.getElementById('achatId').value, 10) : null,
        fournisseur_id:      parseInt(document.getElementById('fournisseurId').value, 10),
        numero_reception:    document.getElementById('numeroReception').value.trim(),
        date_reception:      document.getElementById('dateReception').value,
        numero_bon_livraison: document.getElementById('numeroBonLivraison').value.trim() || null,
        observations:        document.getElementById('observations').value.trim() || null,
        montant_total_ht:    totalHt,
        montant_total_tva:   totalTva,
        montant_total_ttc:   totalHt + totalTva,
        lignes: State.lignes.filter(l => l.medicament_id && l.quantite_recue > 0),
    };

    try {
        let response;
        if (State.editingId) {
            response = await Api.put(`/receptions/${State.editingId}`, data);
        } else {
            response = await Api.post('/receptions', data);
        }

        Toast.success(response.message);
        closeModal('receptionModal');
        await loadReceptions(State.pagination.current_page || 1);
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

    safe('modalCloseBtn', 'click', () => closeModal('receptionModal'));
    safe('modalCancelBtn', 'click', () => closeModal('receptionModal'));
    safe('detailCloseBtn', 'click', () => closeModal('detailModal'));
    safe('detailCloseBtn2', 'click', () => closeModal('detailModal'));
    safe('confirmCloseBtn', 'click', () => closeModal('confirmModal'));
    safe('confirmCancelBtn', 'click', () => closeModal('confirmModal'));

    safe('confirmOkBtn', 'click', async () => {
        if (confirmCallback) await confirmCallback();
        closeModal('confirmModal');
        confirmCallback = null;
    });

    safe('receptionForm', 'submit', submitReceptionForm);

    let searchTimeout;
    safe('searchInput', 'input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            State.filters.search = e.target.value.trim();
            loadReceptions(1);
        }, 400);
    });

    safe('filterFournisseur', 'change', (e) => {
        State.filters.fournisseur_id = e.target.value;
        loadReceptions(1);
    });

    safe('filterStatut', 'change', (e) => {
        State.filters.statut = e.target.value;
        loadReceptions(1);
    });

    safe('resetFiltersBtn', 'click', () => {
        State.filters = { search: '', fournisseur_id: '', statut: '' };
        document.getElementById('searchInput').value = '';
        document.getElementById('filterFournisseur').value = '';
        document.getElementById('filterStatut').value = '';
        loadReceptions(1);
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
        achat_id: 'achatId',
        fournisseur_id: 'fournisseurId',
        numero_reception: 'numeroReception',
        date_reception: 'dateReception',
        numero_bon_livraison: 'numeroBonLivraison',
        observations: 'observations',
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