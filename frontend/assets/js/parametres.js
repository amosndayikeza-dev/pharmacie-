/**
 * Logique de la page Paramètres.
 */

Guard.requireAuth();

document.addEventListener('DOMContentLoaded', async () => {
    await loadParametres();
    setupEventListeners();
});

async function loadParametres() {
    const loader  = document.getElementById('loader');
    const content = document.getElementById('content');

    loader.hidden = false;
    content.hidden = true;

    try {
        const response = await Api.get('/parametres');
        const groupes = response.data || {};

        Object.entries(groupes).forEach(([groupe, params]) => {
            renderGroupe(groupe, params);
        });

        content.hidden = false;
    } catch (error) {
        Toast.error('Erreur : ' + error.message);
    } finally {
        loader.hidden = true;
    }
}

function renderGroupe(groupe, params) {
    const container = document.getElementById(`parametres-${groupe}`);
    if (!container) return;

    container.innerHTML = params.map(p => {
        const inputId = `param_${p.cle}`;
        const value = p.valeur ?? '';
        const fullWidth = ['adresse', 'pied_ticket', 'nom', 'description'].some(k => p.cle.includes(k));

        if (p.type === 'boolean') {
            return `
                <div class="form-field full-width">
                    <label class="form-checkbox">
                        <input type="checkbox"
                               id="${inputId}"
                               data-cle="${p.cle}"
                               data-type="${p.type}"
                               ${value ? 'checked' : ''}>
                        <span>${escapeHtml(p.libelle || p.cle)}</span>
                    </label>
                    ${p.description ? `<small class="field-hint">${escapeHtml(p.description)}</small>` : ''}
                </div>
            `;
        }

        const inputType = (p.type === 'integer' || p.type === 'decimal') ? 'number' : 'text';
        const step = p.type === 'decimal' ? '0.01' : '1';

        return `
            <div class="form-field ${fullWidth ? 'full-width' : ''}">
                <label for="${inputId}">${escapeHtml(p.libelle || p.cle)}</label>
                <input type="${inputType}"
                       id="${inputId}"
                       data-cle="${p.cle}"
                       data-type="${p.type}"
                       value="${escapeHtml(String(value))}"
                       ${inputType === 'number' ? `step="${step}"` : ''}>
                ${p.description ? `<small class="field-hint">${escapeHtml(p.description)}</small>` : ''}
            </div>
        `;
    }).join('');
}

function setupEventListeners() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const group = tab.getAttribute('data-group');
            document.querySelectorAll('.param-groupe').forEach(el => {
                el.hidden = el.getAttribute('data-group') !== group;
            });
        });
    });

    document.getElementById('saveAllBtn').addEventListener('click', saveAll);
}

async function saveAll() {
    const btn = document.getElementById('saveAllBtn');
    btn.disabled = true;

    const parametres = {};
    document.querySelectorAll('[data-cle]').forEach(el => {
        const cle = el.getAttribute('data-cle');
        const type = el.getAttribute('data-type');

        if (type === 'boolean') {
            parametres[cle] = el.checked;
        } else if (type === 'integer') {
            parametres[cle] = parseInt(el.value, 10) || 0;
        } else if (type === 'decimal') {
            parametres[cle] = parseFloat(el.value) || 0;
        } else {
            parametres[cle] = el.value;
        }
    });

    try {
        const response = await Api.put('/parametres', { parametres });
        Toast.success(response.message || 'Paramètres enregistrés.');
    } catch (error) {
        Toast.error(error.message);
    } finally {
        btn.disabled = false;
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}