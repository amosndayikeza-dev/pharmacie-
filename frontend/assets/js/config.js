const CONFIG = {
    API_BASE_URL: 'http://127.0.0.1:8000/api/v1',
    APP_NAME: 'LGO Pharmacie Vétérinaire',
    STORAGE_KEYS: {
        TOKEN: 'lgo_auth_token',
        USER:  'lgo_auth_user',
    },
    ROUTES: {
        LOGIN:      'index.html',
        DASHBOARD:  'pages/dashboard.html',
        FORBIDDEN:  'pages/forbidden.html',
        NOT_FOUND:  'pages/not-found.html',
    },
};

function goTo(route) {
    const inPages = window.location.pathname.includes('/pages/');
    if (inPages) {
        if (route.startsWith('pages/')) {
            window.location.href = route.replace('pages/', '');
        } else {
            window.location.href = '../' + route;
        }
    } else {
        window.location.href = route;
    }
}