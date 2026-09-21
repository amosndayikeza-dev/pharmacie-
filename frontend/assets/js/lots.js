/**
 * Logique de la page Lots & Stock (FEFO).
 */

// === 1. Protéger la page ===
Guard.requireAuth();

// === 2. État ===
const State = {
    lots: [],
    medicaments: [],
    fournisseurs: [],
    pagination: { current_page: 1, last_page: 1, per_page: 20, total: 0 },
    filters: {
        search:        '',
        medicament_id: '',
        fournisseur_id: '',
        peremption:    '',
    },
    stats: {
        perimes: 0,
        j7: 0,
        j30: 0,
        actifs: 0,
    },
};

// === 3. Init ===
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await Promise.all([loadMedicaments(), loadFournisseurs()]);
    } catch (e) {
        console.warn('[Lots] Erreur chargement listes (non bloquant)', e);
    }

    try {
        await loadLots();
    } catch (error) {
        console.error('[Lots] loadLots a échoué', error);
    }

    setupEventListeners();
});

// ============================================================
// CHARGEMENT
// ============================================================

async function loadLots(page = 1) {
    const tbody = document.getElementById('lotsTbody');
    tbody.innerHTML = `<tr><td colspan="8" class="empty"><div class="spinner" style="margin:20px auto;"></div></td></tr>`;

    try {
        const params = new URLSearchParams({ page, per_page: 20 });

        if (State.filters.search)         params.append('search', State.filters.search);
        if (State.filters.medicament_id)  params.append('medicament_id', State.filters.medicament_id);
        if (State.filters.fournisseur_id) params.append('fournisseur_id', State.filters.fournisseur_id);
        if (State.filters.peremption)     params.append('peremption', State.filters.peremption);

        const response = await Api.get(`/lots?${params}`);

        State.lots = response.data || [];
        State.pagination = response.meta || {};

        renderTable();
        renderPagination();
        updateStats();
    } catch (error) {
        const msg = error.status
            ? `[${error.status}] ${error.message}`
            : error.message;

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

async function loadMedicaments() {
    try {
        const response = await Api.get('/medicaments?per_page=200&actif=true');
        State.medicaments = response.data || [];

        const filterSelect = document.getElementById('filterMedicament');
        const formSelect   = document.getElementById('medicamentId');

        State.medicaments
            .sort((a, b) => (a.nom || '').localeCompare(b.nom || ''))
            .forEach(m => {
                const opt = document.createElement('option');
                opt.value = m.id;
                opt.textContent = m.nom;
                filterSelect.appendChild(opt.cloneNode(true));
                formSelect.appendChild(opt);
            });
    } catch (e) {
        console.warn('[Lots] loadMedicaments a échoué', e);
    }
}

async function loadFournisseurs() {
    try {
        const response = await Api.get('/fournisseurs?per_page=200&actif=true');
        State.fournisseurs = response.data || [];

        const filterSelect = document.getElementById('filterFournisseur');
        const formSelect   = document.getElementById('fournisseurId');

        State.fournisseurs
            .sort((a, b) => (a.nom || '').localeCompare(b.nom || ''))
            .forEach(f => {
                const opt = document.createElement('option');
                opt.value = f.id;
                opt.textContent = f.nom;
                filterSelect.appendChild(opt.cloneNode(true));
                formSelect.appendChild(opt);
            });
    } catch (e) {
        console.warn('[Lots] loadFournisseurs a échoué', e);
    }
}

// ============================================================
// STATS & ALERTES
// ============================================================

function updateStats() {
    // Calculer les stats depuis la liste actuelle
    let perimes = 0, j7 = 0, j30 = 0, actifs = 0;

    State.lots.forEach(lot => {
        if (lot.quantite_restante <= 0) return;
        actifs++;

        const jours = lot.jours_avant_peremption;
        if (jours === undefined || jours === null) return;

        if (jours < 0)      perimes++;
        else if (jours <= 7) j7++;
        else if (jours <= 30) j30++;
    });

    State.stats = { perimes, j7, j30, actifs };

    document.getElementById('statPerimes').textContent = perimes;
    document.getElementById('statJ7').textContent      = j7;
    document.getElementById('statJ30').textContent     = j30;
    document.getElementById('statActifs').textContent  = actifs;

    // Bannière d'alerte
    const banner = document.getElementById('alertBanner');
    const totalAlertes = perimes + j7 + j30;

    if (totalAlertes > 0) {
        const parts = [];
        if (perimes > 0) parts.push(`${perimes} lot${perimes > 1 ? 's' : ''} périmé${perimes > 1 ? 's' : ''}`);
        if (j7 > 0)      parts.push(`${j7} expire${j7 > 1 ? 'nt' : ''} dans 7 jours`);
        if (j30 > 0)     parts.push(`${j30} dans 30 jours`);

        document.getElementById('alertBannerText').innerHTML = parts.join(' · ');
        banner.style.display = 'flex';

        // Badge sidebar
        const badge = document.getElementById('badgeAlertes');
        if (badge) {
            badge.textContent = totalAlertes;
            badge.hidden = false;
        }
    } else {
        banner.style.display = 'none';
    }
}

// ============================================================
// RENDU
// ============================================================

function renderTable() {
    const tbody = document.getElementById('lotsTbody');

    if (!State.lots.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty">
                    <div class="empty-state">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon"><path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/></svg>
                        <p>Aucun lot trouvé</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = State.lots.map(lot => {
        const medicament = lot.medicament?.nom || '—';
        const fournisseur = lot.fournisseur?.nom || '—';

        // Statut de péremption
        let peremptionBadge = '<span class="badge badge-neutral">—</span>';
        const jours = lot.jours_avant_peremption;

        if (jours !== undefined && jours !== null) {
            if (jours < 0) {
                peremptionBadge = `<span class="badge badge-danger">Périmé (${Math.abs(jours)}j)</span>`;
            } else if (jours <= 7) {
                peremptionBadge = `<span class="badge badge-danger">J-${jours}</span>`;
            } else if (jours <= 30) {
                peremptionBadge = `<span class="badge badge-warning">J-${jours}</span>`;
            } else {
                peremptionBadge = `<span class="badge badge-success">J-${jours}</span>`;
            }
        }

        // Quantité (badge selon stock)
        const qte = lot.quantite_restante ?? 0;
        let qteBadge = 'badge-success';
        if (qte === 0) qteBadge = 'badge-neutral';
        else if (qte < 10) qteBadge = 'badge-warning';

        return `
            <tr>
                <td>
                    <code>${escapeHtml(lot.numero_lot || '—')}</code>
                </td>
                <td>
                    <strong>${escapeHtml(medicament)}</strong>
                </td>
                <td>${escapeHtml(fournisseur)}</td>
                <td>
                    ${lot.date_peremption ? formatDate(lot.date_peremption) : '—'}
                    <br><small class="text-muted">${peremptionBadge}</small>
                </td>
                <td class="text-right">
                    <span class="badge ${qteBadge}">${qte}</span>
                    <br><small class="text-muted">sur ${lot.quantite_initiale}</small>
                </td>
                <td class="text-right">
                    ${lot.prix_achat_ht_unitaire ? formatMoney(lot.prix_achat_ht_unitaire) : '—'}
                </td>
                <td>
                    ${qte === 0
                        ? '<span class="badge badge-neutral">Épuisé</span>'
                        : jours < 0
                            ? '<span class="badge badge-danger">À retirer</span>'
                            : '<span class="badge badge-success">En stock</span>'}
                </td>
                <td class="text-right">
                    <button class="btn btn-ghost btn-icon" data-action="view" data-id="${lot.id}" title="Détail">
                        <span data-icon="eye"></span>
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
    const tbody = document.getElementById('lotsTbody');
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
        case 'view': showLotDetail(id); break;
    }
}

function renderPagination() {
    const container = document.getElementById('paginationContainer');
    const { current_page, last_page, total } = State.pagination;

    if (!last_page || last_page <= 1) {
        container.innerHTML = total
            ? `<div class="pagination-info">${total} lot${total > 1 ? 's' : ''}</div>`
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
    html += `<div class="pagination-info">${total} lot${total > 1 ? 's' : ''} — page ${current_page} / ${last_page}</div>`;

    container.innerHTML = html;
}

function goToPage(page) {
    loadLots(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================
// DÉTAIL D'UN LOT
// ============================================================

async function showLotDetail(id) {
    const body = document.getElementById('detailBody');
    body.innerHTML = '<div class="spinner" style="margin: 20px auto;"></div>';
    document.getElementById('detailModal').classList.add('open');

    try {
        const response = await Api.get(`/lots/${id}?with_stats=1`);
        const lot = response.data;

        const jours = lot.jours_avant_peremption;
        let peremptionText = '—';
        if (jours !== undefined && jours !== null) {
            if (jours < 0) peremptionText = `<span class="badge badge-danger">Périmé depuis ${Math.abs(jours)} jours</span>`;
            else peremptionText = `<span class="badge ${jours <= 7 ? 'badge-danger' : jours <= 30 ? 'badge-warning' : 'badge-success'}">J-${jours}</span>`;
        }

        body.innerHTML = `
            <div class="detail-grid">
                <div class="detail-item full-width">
                    <span class="detail-label">Médicament</span>
                    <span class="detail-value">${escapeHtml(lot.medicament?.nom || '—')}</span>
                    ${lot.medicament?.code_cip ? `<small class="text-muted">${escapeHtml(lot.medicament.code_cip)}</small>` : ''}
                </div>

                <div class="detail-item">
                    <span class="detail-label">N° de lot</span>
                    <span class="detail-value"><code>${escapeHtml(lot.numero_lot)}</code></span>
                </div>

                <div class="detail-item">
                    <span class="detail-label">Fournisseur</span>
                    <span class="detail-value">${escapeHtml(lot.fournisseur?.nom || '—')}</span>
                </div>

                <div class="detail-item">
                    <span class="detail-label">Date de fabrication</span>
                    <span class="detail-value">${lot.date_fabrication ? formatDate(lot.date_fabrication) : '—'}</span>
                </div>

                <div class="detail-item">
                    <span class="detail-label">Date de péremption</span>
                    <span class="detail-value">${formatDate(lot.date_peremption)} ${peremptionText}</span>
                </div>

                <div class="detail-item">
                    <span class="detail-label">Prix d'achat HT</span>
                    <span class="detail-value">${formatMoney(lot.prix_achat_ht_unitaire)}</span>
                </div>

                <div class="detail-item">
                    <span class="detail-label">Quantité initiale</span>
                    <span class="detail-value">${lot.quantite_initiale}</span>
                </div>

                <div class="detail-item">
                    <span class="detail-label">Quantité restante</span>
                    <span class="detail-value"><strong>${lot.quantite_restante}</strong></span>
                </div>
            </div>
        `;
    } catch (error) {
        body.innerHTML = `<p class="empty" style="color: var(--color-danger);">Erreur : ${escapeHtml(error.message)}</p>`;
    }
}

// ============================================================
// FORMULAIRE
// ============================================================

function openCreateModal() {
    document.getElementById('lotForm').reset();
    clearFormErrors();

    // Date de péremption par défaut : +1 an
    const demain = new Date();
    demain.setFullYear(demain.getFullYear() + 1);
    document.getElementById('datePeremption').value = demain.toISOString().split('T')[0];

    document.getElementById('lotModal').classList.add('open');
}

async function submitLotForm(e) {
    e.preventDefault();
    clearFormErrors();

    const btn = document.getElementById('modalSubmitBtn');
    btn.disabled = true;

    const data = {
        medicament_id:           parseInt(document.getElementById('medicamentId').value, 10),
        fournisseur_id:          parseInt(document.getElementById('fournisseurId').value, 10),
        numero_lot:              document.getElementById('numeroLot').value.trim(),
        date_fabrication:        document.getElementById('dateFabrication').value || null,
        date_peremption:         document.getElementById('datePeremption').value,
        prix_achat_ht_unitaire:  parseFloat(document.getElementById('prixAchat').value),
        quantite_initiale:       parseInt(document.getElementById('quantiteInitiale').value, 10),
    };

    try {
        const response = await Api.post('/lots', data);

        Toast.success(response.message || 'Lot créé avec succès.');
        closeModal('lotModal');
        await loadLots();
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
    }
}

// ============================================================
// MODALS
// ============================================================

function closeModal(id) {
    document.getElementById(id).classList.remove('open');
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

    safe('modalCloseBtn', 'click', () => closeModal('lotModal'));
    safe('modalCancelBtn', 'click', () => closeModal('lotModal'));
    safe('detailCloseBtn', 'click', () => closeModal('detailModal'));
    safe('detailCloseBtn2', 'click', () => closeModal('detailModal'));

    safe('lotForm', 'submit', submitLotForm);

    // Boutons de la bannière d'alerte
    document.querySelectorAll('[data-filter]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const filter = e.target.getAttribute('data-filter');
            State.filters.peremption = filter;
            document.getElementById('filterPeremption').value = filter;
            loadLots(1);
        });
    });

    // Filtres
    let searchTimeout;
    safe('searchInput', 'input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            State.filters.search = e.target.value.trim();
            loadLots(1);
        }, 400);
    });

    safe('filterMedicament', 'change', (e) => {
        State.filters.medicament_id = e.target.value;
        loadLots(1);
    });

    safe('filterFournisseur', 'change', (e) => {
        State.filters.fournisseur_id = e.target.value;
        loadLots(1);
    });

    safe('filterPeremption', 'change', (e) => {
        State.filters.peremption = e.target.value;
        loadLots(1);
    });

    safe('resetFiltersBtn', 'click', () => {
        State.filters = { search: '', medicament_id: '', fournisseur_id: '', peremption: '' };
        document.getElementById('searchInput').value = '';
        document.getElementById('filterMedicament').value = '';
        document.getElementById('filterFournisseur').value = '';
        document.getElementById('filterPeremption').value = '';
        loadLots(1);
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
        medicament_id: 'medicamentId',
        fournisseur_id: 'fournisseurId',
        numero_lot: 'numeroLot',
        date_fabrication: 'dateFabrication',
        date_peremption: 'datePeremption',
        prix_achat_ht_unitaire: 'prixAchat',
        quantite_initiale: 'quantiteInitiale',
    };
    return map[field] || field;
}

function formatDate(isoString) {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleDateString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
    });
}

function formatMoney(value) {
    if (value === null || value === undefined) return '—';
    return new Intl.NumberFormat('fr-BI', {
        style: 'currency', currency: 'BIF',
        minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(value);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}