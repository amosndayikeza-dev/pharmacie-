/**
 * Logique de la page Mouvements de stock (lecture seule).
 */

Guard.requireAuth();

const State = {
    mouvements: [],
    pagination: { current_page: 1, last_page: 1, per_page: 20, total: 0 },
    filters: {
        search:     '',
        type:       '',
        date_debut: '',
        date_fin:   '',
    },
};

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadMouvements();
    } catch (error) {
        console.error('[Mouvements] Erreur init:', error);
    }
    setupEventListeners();
});

// ============================================================
// CHARGEMENT
// ============================================================

async function loadMouvements(page = 1) {
    const tbody = document.getElementById('mouvementsTbody');
    tbody.innerHTML = `<tr><td colspan="8" class="empty"><div class="spinner" style="margin:20px auto;"></div></td></tr>`;

    try {
        const params = new URLSearchParams({ page, per_page: 20 });
        if (State.filters.search)     params.append('search', State.filters.search);
        if (State.filters.type)       params.append('type', State.filters.type);
        if (State.filters.date_debut) params.append('date_debut', State.filters.date_debut);
        if (State.filters.date_fin)   params.append('date_fin', State.filters.date_fin);

        const response = await Api.get(`/mouvements-stock?${params}`);
        State.mouvements = response.data || [];
        State.pagination = response.meta || {};

        renderTable();
        renderPagination();
        updateStats();
    } catch (error) {
        const msg = error.status ? `[${error.status}] ${error.message}` : error.message;
        tbody.innerHTML = `<tr><td colspan="8" class="empty" style="color:var(--color-danger);padding:20px;text-align:center;">⚠️ ${escapeHtml(msg)}</td></tr>`;
        try { Toast.error(msg); } catch (e) {}
    }
}

// ============================================================
// STATS
// ============================================================

function updateStats() {
    let entrees = 0, sorties = 0, pertes = 0, ajustements = 0;

    State.mouvements.forEach(m => {
        const qte = m.quantite || 0;
        if (m.type === 'achat')      entrees += Math.abs(qte);
        else if (m.type === 'vente') sorties += Math.abs(qte);
        else if (m.type === 'perte') pertes  += Math.abs(qte);
        else if (m.type === 'ajustement') ajustements += Math.abs(qte);
    });

    document.getElementById('statEntrees').textContent     = entrees;
    document.getElementById('statSorties').textContent     = sorties;
    document.getElementById('statPertes').textContent      = pertes;
    document.getElementById('statAjustements').textContent = ajustements;
}

// ============================================================
// RENDU
// ============================================================

function renderTable() {
    const tbody = document.getElementById('mouvementsTbody');

    if (!State.mouvements.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty">
                    <div class="empty-state">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
                        <p>Aucun mouvement trouvé</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    const typeConfig = {
        achat:      { label: 'Achat',      class: 'badge-success', icon: '↓' },
        vente:      { label: 'Vente',      class: 'badge-danger',  icon: '↑' },
        perte:      { label: 'Perte',      class: 'badge-warning', icon: '⚠' },
        ajustement: { label: 'Ajustement', class: 'badge-info',    icon: '↻' },
    };

    tbody.innerHTML = State.mouvements.map(m => {
        const t = typeConfig[m.type] || { label: m.type, class: 'badge-neutral', icon: '•' };
        const qte = m.quantite || 0;
        const signe = qte >= 0 ? '+' : '';
        const qteClass = qte >= 0 ? 'quantite-positive' : 'quantite-negative';

        const medicament = m.lot?.medicament?.nom || '—';
        const numeroLot  = m.lot?.numero_lot || '—';

        const utilisateur = m.utilisateur
            ? `${m.utilisateur.prenom || ''} ${m.utilisateur.nom || ''}`.trim()
            : 'Système';

        return `
            <tr>
                <td>
                    <strong>${formatTime(m.date_heure)}</strong>
                    <br><small class="text-muted">${formatDate(m.date_heure)}</small>
                </td>
                <td>
                    <span class="badge ${t.class}">${t.icon} ${t.label}</span>
                </td>
                <td>
                    <strong>${escapeHtml(medicament)}</strong>
                    <br><small class="text-muted">Lot ${escapeHtml(numeroLot)}</small>
                </td>
                <td>
                    ${m.reference_type && m.reference_id
                        ? `<code>${escapeHtml(m.reference_type)} #${m.reference_id}</code>`
                        : '<span class="text-muted">—</span>'}
                </td>
                <td class="text-right">
                    <strong class="${qteClass}">${signe}${qte}</strong>
                </td>
                <td>${escapeHtml(utilisateur)}</td>
                <td>
                    ${m.motif
                        ? `<span class="text-muted truncate">${escapeHtml(m.motif)}</span>`
                        : '<span class="text-muted">—</span>'}
                </td>
                <td class="text-right">
                    <button class="btn btn-ghost btn-icon" data-action="view" data-id="${m.id}" title="Détail">
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
    const tbody = document.getElementById('mouvementsTbody');
    tbody.removeEventListener('click', handleRowClick);
    tbody.addEventListener('click', handleRowClick);
}

function handleRowClick(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const id = parseInt(btn.getAttribute('data-id'), 10);
    if (id) showDetail(id);
}

function renderPagination() {
    const container = document.getElementById('paginationContainer');
    const { current_page, last_page, total } = State.pagination;

    if (!last_page || last_page <= 1) {
        container.innerHTML = total ? `<div class="pagination-info">${total} mouvement${total > 1 ? 's' : ''}</div>` : '';
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
    html += `<div class="pagination-info">${total} mouvement${total > 1 ? 's' : ''} — page ${current_page} / ${last_page}</div>`;
    container.innerHTML = html;
}

function goToPage(page) {
    loadMouvements(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================
// DÉTAIL
// ============================================================

async function showDetail(id) {
    const body = document.getElementById('detailBody');
    body.innerHTML = '<div class="spinner" style="margin: 20px auto;"></div>';
    document.getElementById('detailModal').classList.add('open');

    try {
        const response = await Api.get(`/mouvements-stock/${id}`);
        const m = response.data;

        const typeConfig = {
            achat:      'Achat (entrée)',
            vente:      'Vente (sortie)',
            perte:      'Perte',
            ajustement: 'Ajustement',
        };

        const qte = m.quantite || 0;
        const signe = qte >= 0 ? '+' : '';

        body.innerHTML = `
            <div class="detail-grid">
                <div class="detail-item">
                    <span class="detail-label">Date / Heure</span>
                    <span class="detail-value">${formatDateTime(m.date_heure)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Type</span>
                    <span class="detail-value">${escapeHtml(typeConfig[m.type] || m.type)}</span>
                </div>
                <div class="detail-item full-width">
                    <span class="detail-label">Médicament</span>
                    <span class="detail-value">${escapeHtml(m.lot?.medicament?.nom || '—')}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">N° de lot</span>
                    <span class="detail-value"><code>${escapeHtml(m.lot?.numero_lot || '—')}</code></span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Quantité</span>
                    <span class="detail-value">
                        <strong class="${qte >= 0 ? 'quantite-positive' : 'quantite-negative'}">${signe}${qte}</strong>
                    </span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Utilisateur</span>
                    <span class="detail-value">
                        ${m.utilisateur
                            ? escapeHtml(`${m.utilisateur.prenom || ''} ${m.utilisateur.nom || ''}`.trim())
                            : 'Système'}
                    </span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Référence</span>
                    <span class="detail-value">
                        ${m.reference_type
                            ? `<code>${escapeHtml(m.reference_type)} #${m.reference_id}</code>`
                            : '—'}
                    </span>
                </div>
                ${m.motif ? `
                    <div class="detail-item full-width">
                        <span class="detail-label">Motif</span>
                        <span class="detail-value">${escapeHtml(m.motif)}</span>
                    </div>
                ` : ''}
            </div>
        `;
    } catch (error) {
        body.innerHTML = `<p class="empty" style="color: var(--color-danger);">⚠️ ${escapeHtml(error.message)}</p>`;
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

    safe('detailCloseBtn', 'click', () => closeModal('detailModal'));
    safe('detailCloseBtn2', 'click', () => closeModal('detailModal'));

    let searchTimeout;
    safe('searchInput', 'input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            State.filters.search = e.target.value.trim();
            loadMouvements(1);
        }, 400);
    });

    safe('filterType', 'change', (e) => {
        State.filters.type = e.target.value;
        loadMouvements(1);
    });

    safe('filterDateDebut', 'change', (e) => {
        State.filters.date_debut = e.target.value;
        loadMouvements(1);
    });

    safe('filterDateFin', 'change', (e) => {
        State.filters.date_fin = e.target.value;
        loadMouvements(1);
    });

    safe('resetFiltersBtn', 'click', () => {
        State.filters = { search: '', type: '', date_debut: '', date_fin: '' };
        document.getElementById('searchInput').value = '';
        document.getElementById('filterType').value = '';
        document.getElementById('filterDateDebut').value = '';
        document.getElementById('filterDateFin').value = '';
        loadMouvements(1);
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

function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatTime(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}