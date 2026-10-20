// web/js/services/state.js
export const state = {
    _user: null,
    _token: null,

    getUser() {
        if (!this._user) {
            const stored =
                localStorage.getItem('user') ||
                sessionStorage.getItem('user');

            if (stored) {
                try {
                    this._user = JSON.parse(stored);
                } catch {
                    this._user = null;
                }
            }
        }
        return this._user;
    },

    setUser(user, remember = false) {
        this._user = user;

        localStorage.removeItem('user');
        sessionStorage.removeItem('user');

        if (remember) {
            localStorage.setItem('user', JSON.stringify(user));
            localStorage.setItem('remember', 'true');
        } else {
            sessionStorage.setItem('user', JSON.stringify(user));
            localStorage.removeItem('remember');
        }
    },

    clearUser() {
        this._user = null;
        localStorage.removeItem('user');
        sessionStorage.removeItem('user');
        localStorage.removeItem('remember');
    },

    isAuthenticated() {
        return !!this.getUser();
    },

    getToken() {
        return (
            this._token ||
            localStorage.getItem('token') ||
            sessionStorage.getItem('token')
        );
    },

    setToken(token, remember = false) {
        this._token = token;

        localStorage.removeItem('token');
        sessionStorage.removeItem('token');

        if (remember) {
            localStorage.setItem('token', token);
        } else {
            sessionStorage.setItem('token', token);
        }
    },

    // ✅ Helpers de rôles (4 rôles)
    isSuperAdmin()   { return this.getUser()?.role === 'super_admin'; },
    isChef()         { return this.getUser()?.role === 'chef'; },
    isAgent()        { return this.getUser()?.role === 'agent'; },
    isAdminSysteme() { return this.getUser()?.role === 'admin_systeme'; },
};