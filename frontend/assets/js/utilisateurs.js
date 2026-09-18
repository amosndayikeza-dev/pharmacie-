/**
 * Logique de la page Utilisateurs (CRUD complet).
 *
 * Le layout (sidebar, header, footer) est injecté par components.js + layout.js.
 * Ce fichier ne contient QUE la logique de la page.
 */

// === 1. Protéger la page ===
Guard.requireAuth();

// === 2. État ===
const State = {
    users: [],
    pagination: { current_page: 1, last_page: 1, per_page: 20, total: 0 },
    filters: {
        search: '',
        role:   '',
        actif:  '',
    },
    editingId: null,
};

// === 3. Init ===
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadUsers();
    } catch (error) {
        console.error('[Utilisateurs] Erreur init:', error);
    }
    setupEventListeners();
});

// ============================================================
// CHARGEMENT
// ============================================================

async function loadUsers(page = 1) {
    const tbody = document.getElementById('usersTbody');
    tbody.innerHTML = `<tr><td colspan="6" class="empty"><div class="spinner" style="margin:20px auto;"></div></td></tr>`;

    try {
        const params = new URLSearchParams({ page, per_page: 20 });

        if (State.filters.search) params.append('search', State.filters.search);
        if (State.filters.role)   params.append('role', State.filters.role);
        if (State.filters.actif)  params.append('actif', State.filters.actif);

        const response = await Api.get(`/users?${params}`);

        State.users = response.data || [];
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

// ============================================================
// RENDU
// ============================================================

function renderTable() {
    const tbody = document.getElementById('usersTbody');

    if (!State.users.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty">
                    <div class="empty-state">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                        <p>Aucun utilisateur trouvé</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    const currentUserId = (Storage.getUser() || {}).id;

    tbody.innerHTML = State.users.map(u => {
        const roleClass = {
            'Administrateur': 'badge-danger',
            'Pharmacien':     'badge-warning',
            'Vendeur':        'badge-info',
        }[u.role] || 'badge-neutral';

        const isSelf = u.id === currentUserId;

        return `
            <tr>
                <td>
                    <strong>${escapeHtml(u.nom_complet || (u.prenom + ' ' + u.nom))}</strong>
                    ${isSelf ? '<br><small class="text-muted">(vous)</small>' : ''}
                </td>
                <td>${escapeHtml(u.email)}</td>
                <td><span class="badge ${roleClass}">${escapeHtml(u.role)}</span></td>
                <td>
                    ${u.actif
                        ? '<span class="badge badge-success">Actif</span>'
                        : '<span class="badge badge-neutral">Inactif</span>'}
                </td>
                <td>${u.derniere_connexion ? formatDateTime(u.derniere_connexion) : '—'}</td>
                <td class="text-right">
                    <button class="btn btn-ghost btn-icon" data-action="edit" data-id="${u.id}" title="Modifier">
                        <span data-icon="edit"></span>
                    </button>
                    <button class="btn btn-ghost btn-icon" data-action="reset" data-id="${u.id}" title="Réinitialiser mot de passe">
                        <span data-icon="key"></span>
                    </button>
                    ${!isSelf ? `
                        <button class="btn btn-ghost btn-icon" data-action="toggle" data-id="${u.id}" title="${u.actif ? 'Désactiver' : 'Activer'}">
                            <span data-icon="power"></span>
                        </button>
                    ` : ''}
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
    const tbody = document.getElementById('usersTbody');
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
        case 'edit':   editUser(id); break;
        case 'toggle': toggleActif(id); break;
        case 'reset':  openResetPassword(id); break;
    }
}

function renderPagination() {
    const container = document.getElementById('paginationContainer');
    const { current_page, last_page, total } = State.pagination;

    if (!last_page || last_page <= 1) {
        container.innerHTML = total
            ? `<div class="pagination-info">${total} utilisateur${total > 1 ? 's' : ''}</div>`
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
    html += `<div class="pagination-info">${total} utilisateur${total > 1 ? 's' : ''} — page ${current_page} / ${last_page}</div>`;

    container.innerHTML = html;
}

function goToPage(page) {
    loadUsers(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================
// ACTIONS
// ============================================================

function openCreateModal() {
    State.editingId = null;
    document.getElementById('modalTitle').textContent = 'Nouvel utilisateur';
    document.getElementById('submitBtnText').textContent = 'Créer';
    document.getElementById('userForm').reset();
    document.getElementById('actif').checked = true;

    // Afficher les champs mot de passe (création)
    document.getElementById('passwordField').style.display = '';
    document.getElementById('passwordConfirmField').style.display = '';
    document.getElementById('password').required = true;
    document.getElementById('passwordConfirm').required = true;

    clearFormErrors();
    document.getElementById('userModal').classList.add('open');
}

function editUser(id) {
    const u = State.users.find(x => x.id === id);
    if (!u) return;

    State.editingId = id;
    document.getElementById('modalTitle').textContent = 'Modifier l\'utilisateur';
    document.getElementById('submitBtnText').textContent = 'Enregistrer';

    document.getElementById('userId').value = u.id;
    document.getElementById('nom').value = u.nom || '';
    document.getElementById('prenom').value = u.prenom || '';
    document.getElementById('email').value = u.email || '';
    document.getElementById('role').value = u.role || 'Vendeur';
    document.getElementById('actif').checked = !!u.actif;

    // Masquer les champs mot de passe (modification)
    document.getElementById('passwordField').style.display = 'none';
    document.getElementById('passwordConfirmField').style.display = 'none';
    document.getElementById('password').required = false;
    document.getElementById('passwordConfirm').required = false;

    clearFormErrors();
    document.getElementById('userModal').classList.add('open');
}

async function toggleActif(id) {
    try {
        const response = await Api.post(`/users/${id}/toggle-actif`);
        Toast.success(response.message);
        await loadUsers(State.pagination.current_page || 1);
    } catch (error) {
        Toast.error(error.message);
    }
}

function openResetPassword(id) {
    const u = State.users.find(x => x.id === id);
    if (!u) return;

    document.getElementById('resetPwdUserId').value = u.id;
    document.getElementById('resetPwdUserName').textContent =
        u.nom_complet || `${u.prenom} ${u.nom}`;

    document.getElementById('resetPasswordForm').reset();
    clearFormErrors();
    document.getElementById('resetPasswordModal').classList.add('open');
}

// ============================================================
// SOUMISSION FORMULAIRE
// ============================================================

async function submitUserForm(e) {
    e.preventDefault();
    clearFormErrors();

    const btn = document.getElementById('modalSubmitBtn');
    const originalText = document.getElementById('submitBtnText').textContent;
    btn.disabled = true;
    document.getElementById('submitBtnText').textContent = 'Enregistrement...';

    const data = {
        nom:    document.getElementById('nom').value.trim(),
        prenom: document.getElementById('prenom').value.trim(),
        email:  document.getElementById('email').value.trim(),
        role:   document.getElementById('role').value,
        actif:  document.getElementById('actif').checked,
    };

    // Ajouter le mot de passe UNIQUEMENT en création
    if (!State.editingId) {
        data.password = document.getElementById('password').value;
        data.password_confirmation = document.getElementById('passwordConfirm').value;
    }

    try {
        let response;
        if (State.editingId) {
            response = await Api.put(`/users/${State.editingId}`, data);
        } else {
            response = await Api.post('/users', data);
        }

        Toast.success(response.message);
        closeModal('userModal');
        await loadUsers(State.pagination.current_page || 1);
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

async function submitResetPasswordForm(e) {
    e.preventDefault();
    clearFormErrors();

    const id = document.getElementById('resetPwdUserId').value;
    const password = document.getElementById('resetPassword').value;
    const confirm  = document.getElementById('resetPasswordConfirm').value;

    if (password !== confirm) {
        showFieldError('password_confirmation', 'Les mots de passe ne correspondent pas.');
        return;
    }

    const btn = document.getElementById('resetPwdSubmitBtn');
    btn.disabled = true;

    try {
        const response = await Api.post(`/users/${id}/reset-password`, {
            password,
            password_confirmation: confirm,
        });

        Toast.success(response.message);
        closeModal('resetPasswordModal');
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
// MODALS & UTILITAIRES
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

function setupEventListeners() {
    const safe = (id, event, fn) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener(event, fn);
    };

    safe('addBtn', 'click', openCreateModal);

    safe('modalCloseBtn', 'click', () => closeModal('userModal'));
    safe('modalCancelBtn', 'click', () => closeModal('userModal'));
    safe('resetPwdCloseBtn', 'click', () => closeModal('resetPasswordModal'));
    safe('resetPwdCancelBtn', 'click', () => closeModal('resetPasswordModal'));
    safe('confirmCloseBtn', 'click', () => closeModal('confirmModal'));
    safe('confirmCancelBtn', 'click', () => closeModal('confirmModal'));

    safe('confirmOkBtn', 'click', async () => {
        if (confirmCallback) await confirmCallback();
        closeModal('confirmModal');
        confirmCallback = null;
    });

    safe('userForm', 'submit', submitUserForm);
    safe('resetPasswordForm', 'submit', submitResetPasswordForm);

    // Filtres
    let searchTimeout;
    safe('searchInput', 'input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            State.filters.search = e.target.value.trim();
            loadUsers(1);
        }, 400);
    });

    safe('filterRole', 'change', (e) => {
        State.filters.role = e.target.value;
        loadUsers(1);
    });

    safe('filterActif', 'change', (e) => {
        State.filters.actif = e.target.value;
        loadUsers(1);
    });

    safe('resetFiltersBtn', 'click', () => {
        State.filters = { search: '', role: '', actif: '' };
        document.getElementById('searchInput').value = '';
        document.getElementById('filterRole').value = '';
        document.getElementById('filterActif').value = '';
        loadUsers(1);
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
        nom: 'nom',
        prenom: 'prenom',
        email: 'email',
        role: 'role',
        password: 'password',
        password_confirmation: 'passwordConfirm',
    };
    return map[field] || field;
}

function formatDateTime(isoString) {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleString('fr-FR', {
        day:    '2-digit',
        month:  '2-digit',
        year:   'numeric',
        hour:   '2-digit',
        minute: '2-digit',
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}