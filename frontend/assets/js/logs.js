/**
 * Logique de la page Logs (audit RGPD, lecture seule).
 */

Guard.requireAuth();

const State = {
    logs: [],
    pagination: { current_page: 1, last_page: 1, per_page: 20, total: 0 },
    filters: {
        search:     '',
        module:     '',
        date_debut: '',
        date_fin:   '',
    },
};

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadLogs();
    } catch (error) {
        console.error('[Logs] Erreur init:', error);
    }
    setupEventListeners();
});

// ============================================================
// CHARGEMENT
// ============================================================

async function loadLogs(page = 1) {
    const tbody = document.getElementById('logsTbody');
    tbody.innerHTML = `<tr><td colspan="7" class="empty"><div class="spinner" style="margin:20px auto;"></div></td></tr>`;

    try {
        const params = new URLSearchParams({ page, per_page: 20 });
        if (State.filters.search)     params.append('search', State.filters.search);
        if (State.filters.module)     params.append('module', State.filters.module);
        if (State.filters.date_debut) params.append('date_debut', State.filters.date_debut);
        if (State.filters.date_fin)   params.append('date_fin', State.filters.date_fin);

        const response = await Api.get(`/logs?${params}`);
        State.logs = response.data || [];
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

// ============================================================
// STATS
// ============================================================

function updateStats() {
    let creations = 0, modifications = 0, suppressions = 0;

    State.logs.forEach(l => {
        const action = (l.action || '').toLowerCase();
        if (action.startsWith('creation'))      creations++;
        else if (action.startsWith('modification')) modifications++;
        else if (action.startsWith('suppression')) suppressions++;
    });

    document.getElementById('statTotal').textContent         = State.pagination.total || State.logs.length;
    document.getElementById('statCreations').textContent     = creations;
    document.getElementById('statModifications').textContent = modifications;
    document.getElementById('statSuppressions').textContent  = suppressions;
}

// ============================================================
// RENDU
// ============================================================

function renderTable() {
    const tbody = document.getElementById('logsTbody');

    if (!State.logs.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty">
                    <div class="empty-state">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                        <p>Aucun log trouvé</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = State.logs.map(l => {
        const utilisateur = l.utilisateur
            ? `${l.utilisateur.prenom || ''} ${l.utilisateur.nom || ''}`.trim()
            : 'Système';

        const actionClass = getActionClass(l.action);
        const entite = l.entite_type
            ? `${formatEntity(l.entite_type)} #${l.entite_id}`
            : '—';

        return `
            <tr>
                <td>
                    <strong>${formatTime(l.date_heure)}</strong>
                    <br><small class="text-muted">${formatDate(l.date_heure)}</small>
                </td>
                <td>${escapeHtml(utilisateur)}</td>
                <td>
                    <span class="badge ${actionClass}">${escapeHtml(l.action || '—')}</span>
                </td>
                <td>
                    <span class="badge badge-neutral">${escapeHtml(l.module || '—')}</span>
                </td>
                <td>
                    ${entite !== '—'
                        ? `<code>${escapeHtml(entite)}</code>`
                        : '<span class="text-muted">—</span>'}
                </td>
                <td>
                    ${l.ip_address
                        ? `<code>${escapeHtml(l.ip_address)}</code>`
                        : '<span class="text-muted">—</span>'}
                </td>
                <td class="text-right">
                    <button class="btn btn-ghost btn-icon" data-action="view" data-id="${l.id}" title="Détail">
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
    const tbody = document.getElementById('logsTbody');
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
        container.innerHTML = total ? `<div class="pagination-info">${total} log${total > 1 ? 's' : ''}</div>` : '';
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
    html += `<div class="pagination-info">${total} log${total > 1 ? 's' : ''} — page ${current_page} / ${last_page}</div>`;
    container.innerHTML = html;
}

function goToPage(page) {
    loadLogs(page);
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
        const response = await Api.get(`/logs/${id}`);
        const l = response.data;

        const utilisateur = l.utilisateur
            ? `${l.utilisateur.prenom || ''} ${l.utilisateur.nom || ''}`.trim()
            : 'Système';

        const entite = l.entite_type
            ? `${formatEntity(l.entite_type)} #${l.entite_id}`
            : '—';

        const avant  = l.donnees_avant ? formatJson(l.donnees_avant) : null;
        const apres  = l.donnees_apres ? formatJson(l.donnees_apres) : null;

        body.innerHTML = `
            <div class="detail-grid" style="margin-bottom: 20px;">
                <div class="detail-item">
                    <span class="detail-label">Date / Heure</span>
                    <span class="detail-value">${formatDateTime(l.date_heure)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Utilisateur</span>
                    <span class="detail-value">${escapeHtml(utilisateur)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Action</span>
                    <span class="detail-value">
                        <span class="badge ${getActionClass(l.action)}">${escapeHtml(l.action || '—')}</span>
                    </span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Module</span>
                    <span class="detail-value"><span class="badge badge-neutral">${escapeHtml(l.module || '—')}</span></span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Entité</span>
                    <span class="detail-value"><code>${escapeHtml(entite)}</code></span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">IP</span>
                    <span class="detail-value"><code>${escapeHtml(l.ip_address || '—')}</code></span>
                </div>
                <div class="detail-item full-width">
                    <span class="detail-label">User-Agent</span>
                    <span class="detail-value"><small>${escapeHtml(l.user_agent || '—')}</small></span>
                </div>
            </div>

            ${avant || apres ? `
                <h4 style="font-size: 0.9rem; font-weight: 600; margin-bottom: 12px;">Données</h4>

                <div class="json-split">
                    ${avant ? `
                        <div class="json-block json-avant">
                            <div class="json-header">Avant</div>
                            <pre>${escapeHtml(avant)}</pre>
                        </div>
                    ` : ''}
                    ${apres ? `
                        <div class="json-block json-apres">
                            <div class="json-header">Après</div>
                            <pre>${escapeHtml(apres)}</pre>
                        </div>
                    ` : ''}
                </div>
            ` : ''}
        `;
    } catch (error) {
        body.innerHTML = `<p class="empty" style="color: var(--color-danger);">⚠️ ${escapeHtml(error.message)}</p>`;
    }
}

// ============================================================
// HELPERS
// ============================================================

function getActionClass(action) {
    if (!action) return 'badge-neutral';
    const a = action.toLowerCase();
    if (a.startsWith('creation'))      return 'badge-success';
    if (a.startsWith('modification')) return 'badge-warning';
    if (a.startsWith('suppression')) return 'badge-danger';
    if (a.includes('connexion') || a.includes('login')) return 'badge-info';
    return 'badge-neutral';
}

function formatEntity(type) {
    if (!type) return '—';
    const parts = type.split('\\');
    return parts[parts.length - 1];
}

function formatJson(data) {
    try {
        return JSON.stringify(data, null, 2);
    } catch {
        return String(data);
    }
}

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
            loadLogs(1);
        }, 400);
    });

    safe('filterModule', 'change', (e) => {
        State.filters.module = e.target.value;
        loadLogs(1);
    });

    safe('filterDateDebut', 'change', (e) => {
        State.filters.date_debut = e.target.value;
        loadLogs(1);
    });

    safe('filterDateFin', 'change', (e) => {
        State.filters.date_fin = e.target.value;
        loadLogs(1);
    });

    safe('resetFiltersBtn', 'click', () => {
        State.filters = { search: '', module: '', date_debut: '', date_fin: '' };
        document.getElementById('searchInput').value = '';
        document.getElementById('filterModule').value = '';
        document.getElementById('filterDateDebut').value = '';
        document.getElementById('filterDateFin').value = '';
        loadLogs(1);
    });

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.classList.remove('open');
        });
    });
}