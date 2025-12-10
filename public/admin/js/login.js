// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, checking authManager...');
    
    // Check if authManager is available
    if (typeof authManager === 'undefined') {
        console.error('authManager is not defined. Make sure auth.js is loaded before login.js');
        showError('System error: Authentication module not loaded. Please refresh the page.');
        return;
    }
    
    console.log('authManager found:', authManager);
    console.log('Is authenticated?', authManager.isAuthenticated());

    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    const errorText = document.getElementById('errorText');
    const rememberCheckbox = document.getElementById('remember');

    // Check if already logged in
    if (authManager.isAuthenticated()) {
        console.log('Already authenticated, checking token...');
        console.log('Token exists:', !!localStorage.getItem('adminToken'));
        console.log('Admin data:', localStorage.getItem('adminData'));
        
        showSuccess('Already logged in. Redirecting to dashboard...');
        setTimeout(() => {
    console.log('Force redirecting...');
    // Try multiple ways
    window.location.href = '/admin/dashboard';
    window.location.replace('/admin/dashboard');
    
    // If still not redirecting after 2 seconds, show message
    setTimeout(() => {
        if (window.location.pathname !== '/admin/dashboard') {
            alert('Redirect failed. Please click OK to go to dashboard.');
            window.location.href = '/admin/dashboard';
        }
    }, 2000);
}, 1000);
        return;
    } else {
        console.log('Not authenticated, showing login form');
    }

    // Focus on username field
    usernameInput.focus();

    // Handle form submission
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        console.log('Login form submitted');
        
        const username = usernameInput.value.trim();
        const password = passwordInput.value;

        console.log('Username:', username);
        console.log('Password length:', password.length);

        // Basic validation
        if (!username) {
            showError('Please enter username');
            usernameInput.focus();
            return;
        }
        
        if (!password) {
            showError('Please enter password');
            passwordInput.focus();
            return;
        }

        // Show loading state
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        const originalDisabled = submitBtn.disabled;
        
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Logging in...';
        submitBtn.disabled = true;
        
        // Hide any previous error
        hideError();

        try {
            console.log('Calling authManager.login...');
            // Attempt login
            const result = await authManager.login(username, password);
            console.log('Login result:', result);

            if (result.success) {
                console.log('Login successful!');
                console.log('Token saved:', !!localStorage.getItem('adminToken'));
                console.log('Admin data saved:', localStorage.getItem('adminData'));
                
                // Show success message
                showSuccess('Login successful! Redirecting...');
                
                // Store remember me preference
                if (rememberCheckbox && rememberCheckbox.checked) {
                    console.log('Remember me checked');
                }
                
                console.log('Setting redirect timeout...');
                // Redirect to dashboard after 1 second
                setTimeout(() => {
                    console.log('Redirecting now to /admin/dashboard');
                    console.log('Current location:', window.location.href);
                    window.location.href = '/admin/dashboard';
                }, 1000);
            } else {
                console.log('Login failed:', result.error);
                // Show error
                showError(result.error || 'Login failed');
                
                // Reset button
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = originalDisabled;
                
                // Shake animation for error
                loginForm.classList.add('animate-shake');
                setTimeout(() => {
                    loginForm.classList.remove('animate-shake');
                }, 500);
                
                // Focus back on password field
                passwordInput.focus();
                passwordInput.select();
            }
        } catch (error) {
            console.error('Login form error:', error);
            showError('An unexpected error occurred. Please try again.');
            
            // Reset button
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = originalDisabled;
        }
    });

    // Helper functions
    function showError(message) {
        console.log('Showing error:', message);
        errorText.textContent = message;
        errorMessage.classList.remove('hidden');
        successMessage.classList.add('hidden');
        
        // Auto hide after 5 seconds
        setTimeout(() => {
            hideError();
        }, 5000);
    }

    function hideError() {
        errorMessage.classList.add('hidden');
    }

    function showSuccess(message) {
        console.log('Showing success:', message);
        const successText = document.getElementById('successText');
        if (successText) {
            successText.textContent = message;
        }
        successMessage.classList.remove('hidden');
        errorMessage.classList.add('hidden');
    }

    // Add shake animation style if not already added
    if (!document.querySelector('#shake-style')) {
        const style = document.createElement('style');
        style.id = 'shake-style';
        style.textContent = `
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
                20%, 40%, 60%, 80% { transform: translateX(5px); }
            }
            .animate-shake {
                animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
            }
        `;
        document.head.appendChild(style);
    }

    // Add Enter key support
    passwordInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !loginForm.querySelector('button[type="submit"]').disabled) {
            loginForm.requestSubmit();
        }
    });

    
    
    // Call auto-fill on page load (for development only)
    autoFillTestCredentials();
});