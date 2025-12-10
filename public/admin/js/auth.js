class AuthManager {
    constructor() {
        this.baseURL = '/api/v1/admins';
        this.token = localStorage.getItem('adminToken');
        this.adminData = JSON.parse(localStorage.getItem('adminData') || 'null');
    }

    // Save token to localStorage
    saveToken(token, adminData) {
        this.token = token;
        this.adminData = adminData;
        localStorage.setItem('adminToken', token);
        localStorage.setItem('adminData', JSON.stringify(adminData));
    }

    // Clear token
    clearToken() {
        this.token = null;
        this.adminData = null;
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminData');
    }

    // Get auth headers
    getAuthHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        return headers;
    }

    // Check if user is authenticated
    isAuthenticated() {
        return !!this.token;
    }

    // Redirect if not authenticated
    requireAuth(redirectTo = '/admin') {
        if (!this.isAuthenticated()) {
            window.location.href = redirectTo;
            return false;
        }
        return true;
    }

    // Login function
   
async login(username, password) {
    try {
        console.log('Making login request to:', `${this.baseURL}/login`);
        console.log('Request body:', { username, password });
        
        const response = await fetch(`${this.baseURL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', [...response.headers.entries()]);
        
        const data = await response.json();
        console.log('Response data:', data);

        if (response.ok) {
            console.log('Login successful, saving token...');
            this.saveToken(data.token, data.data.admin);
            return { success: true, data };
        } else {
            console.log('Login failed with error:', data.message);
            return { 
                success: false, 
                error: data.message || 'Login failed' 
            };
        }
    } catch (error) {
        console.error('Login error:', error);
        return { 
            success: false, 
            error: 'Network error. Please try again.' 
        };
    }
}

    // Logout function
    logout() {
        this.clearToken();
        window.location.href = '/admin';
    }

    // Fetch with auth
    async fetchWithAuth(url, options = {}) {
        if (!this.isAuthenticated()) {
            throw new Error('Not authenticated');
        }

        const defaultOptions = {
            headers: this.getAuthHeaders(),
            ...options
        };

        try {
            const response = await fetch(url, defaultOptions);

            // If token expired, logout
            if (response.status === 401) {
                this.logout();
                throw new Error('Session expired. Please login again.');
            }

            return response;
        } catch (error) {
            console.error('Fetch error:', error);
            throw error;
        }
    }
}

// Create and expose global auth instance
// Check if authManager already exists (in case of multiple loads)
if (typeof window.authManager === 'undefined') {
    window.authManager = new AuthManager();
    console.log('AuthManager initialized');
}