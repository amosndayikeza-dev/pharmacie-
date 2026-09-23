/**
 * Logique de la page Mon profil.
 */

Guard.requireAuth();

document.addEventListener('DOMContentLoaded', async () => {
    await loadProfil();
    setupEventListeners();
});

async function loadProfil() {
    try {
        const response = await Api.get('/me');
        const user = response.user || response.data || {};

        document.getElementById('profilNom').textContent =
            user.nom_complet || `${user.prenom || ''} ${user.nom || ''}`.trim();
        document.getElementById('profilEmail').textContent = user.email;
        document.getElementById('profilRole').textContent = user.role;

        const initiales = ((user.prenom?.[0] || '') + (user.nom?.[0] || '')).toUpperCase();
        document.getElementById('profilAvatar').textContent = initiales || '?';

        document.getElementById('nom').value = user.nom || '';
        document.getElementById('prenom').value = user.prenom || '';
        document.getElementById('email').value = user.email || '';
        document.getElementById('role').value = user.role || '';
    } catch (error) {
        Toast.error('Erreur de chargement du profil : ' + error.message);
    }
}

function setupEventListeners() {
    document.getElementById('infoForm').addEventListener('submit', saveInfo);
    document.getElementById('passwordForm').addEventListener('submit', savePassword);
}

async function saveInfo(e) {
    e.preventDefault();
    clearErrors();

    const btn = document.getElementById('saveInfoBtn');
    btn.disabled = true;

    try {
        const user = Storage.getUser();
        if (!user || !user.id) throw new Error('Utilisateur introuvable');

        const data = {
            nom:    document.getElementById('nom').value.trim(),
            prenom: document.getElementById('prenom').value.trim(),
            email:  document.getElementById('email').value.trim(),
        };

        await Api.put(`/users/${user.id}`, data);

        Storage.setUser({
            ...user,
            ...data,
            nom_complet: `${data.prenom} ${data.nom}`,
        });

        Toast.success('Informations mises à jour.');
        await loadProfil();

        if (typeof Layout !== 'undefined') Layout.renderUser();
    } catch (error) {
        if (error.errors) {
            Object.entries(error.errors).forEach(([field, msgs]) => {
                const el = document.querySelector(`[data-error-for="${field}"]`);
                if (el) el.textContent = msgs[0];
            });
        } else {
            Toast.error(error.message);
        }
    } finally {
        btn.disabled = false;
    }
}

async function savePassword(e) {
    e.preventDefault();
    clearErrors();

    const current = document.getElementById('currentPassword').value;
    const nouveau = document.getElementById('newPassword').value;
    const confirm = document.getElementById('newPasswordConfirm').value;

    if (nouveau !== confirm) {
        document.querySelector('[data-error-for="password_confirmation"]').textContent =
            'Les mots de passe ne correspondent pas.';
        return;
    }

    const btn = document.getElementById('savePwdBtn');
    btn.disabled = true;

    try {
        const response = await Api.post('/me/change-password', {
            current_password: current,
            password: nouveau,
            password_confirmation: confirm,
        });

        Toast.success(response.message || 'Mot de passe modifié.');
        document.getElementById('passwordForm').reset();
    } catch (error) {
        if (error.errors) {
            Object.entries(error.errors).forEach(([field, msgs]) => {
                const el = document.querySelector(`[data-error-for="${field}"]`);
                if (el) el.textContent = msgs[0];
            });
        } else {
            Toast.error(error.message);
        }
    } finally {
        btn.disabled = false;
    }
}

function clearErrors() {
    document.querySelectorAll('.field-error').forEach(el => el.textContent = '');
}