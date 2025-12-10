class ModalManager {
    constructor() {
        this.currentResolve = null;
        this.currentReject = null;
        this.currentUserId = null;
        this.currentAction = null;
        
        this.init();
    }

    init() {
        // Confirmation Modal Elements
        this.confirmationModal = document.getElementById('confirmationModal');
        this.confirmationTitle = document.getElementById('confirmationTitle');
        this.confirmationMessage = document.getElementById('confirmationMessage');
        this.confirmationIcon = document.getElementById('confirmationIcon');
        this.confirmationIconType = document.getElementById('confirmationIconType');
        this.confirmationWarning = document.getElementById('confirmationWarning');
        this.confirmationWarningText = document.getElementById('confirmationWarningText');
        this.confirmationCancelBtn = document.getElementById('confirmationCancelBtn');
        this.confirmationConfirmBtn = document.getElementById('confirmationConfirmBtn');
        
        // Success Modal Elements
        this.successModal = document.getElementById('successModal');
        this.successModalMessage = document.getElementById('successModalMessage');
        this.successModalOkBtn = document.getElementById('successModalOkBtn');
        
        // Error Modal Elements
        this.errorModal = document.getElementById('errorModal');
        this.errorModalMessage = document.getElementById('errorModalMessage');
        this.errorModalOkBtn = document.getElementById('errorModalOkBtn');
        
        // Loading Modal Elements
        this.loadingModal = document.getElementById('loadingModal');
        this.loadingModalMessage = document.getElementById('loadingModalMessage');
        
        // Setup event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Confirmation Modal
        this.confirmationCancelBtn.addEventListener('click', () => {
            this.hideConfirmation(false);
        });

        this.confirmationConfirmBtn.addEventListener('click', () => {
            this.hideConfirmation(true);
        });

        // Success Modal
        this.successModalOkBtn.addEventListener('click', () => {
            this.hideSuccess();
        });

        // Error Modal
        this.errorModalOkBtn.addEventListener('click', () => {
            this.hideError();
        });

        // Close modals on background click
        this.confirmationModal.addEventListener('click', (e) => {
            if (e.target === this.confirmationModal) {
                this.hideConfirmation(false);
            }
        });

        this.successModal.addEventListener('click', (e) => {
            if (e.target === this.successModal) {
                this.hideSuccess();
            }
        });

        this.errorModal.addEventListener('click', (e) => {
            if (e.target === this.errorModal) {
                this.hideError();
            }
        });

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (!this.confirmationModal.classList.contains('modal-hidden')) {
                    this.hideConfirmation(false);
                } else if (!this.successModal.classList.contains('modal-hidden')) {
                    this.hideSuccess();
                } else if (!this.errorModal.classList.contains('modal-hidden')) {
                    this.hideError();
                } else if (!this.loadingModal.classList.contains('modal-hidden')) {
                    // Loading modal cannot be closed with Escape
                }
            }
        });
    }

    showConfirmation(options) {
        return new Promise((resolve, reject) => {
            this.currentResolve = resolve;
            this.currentReject = reject;
            this.currentUserId = options.userId;
            this.currentAction = options.action;

            // Set modal content
            this.confirmationTitle.textContent = options.title || 'Confirm Action';
            this.confirmationMessage.textContent = options.message || 'Are you sure you want to perform this action?';
            
            // Set icon based on type
            const types = {
                approve: {
                    icon: 'fa-user-check',
                    color: 'bg-green-100 text-green-600',
                    iconColor: 'text-green-600'
                },
                reject: {
                    icon: 'fa-user-times',
                    color: 'bg-red-100 text-red-600',
                    iconColor: 'text-red-600'
                },
                delete: {
                    icon: 'fa-trash',
                    color: 'bg-red-100 text-red-600',
                    iconColor: 'text-red-600'
                },
                default: {
                    icon: 'fa-question-circle',
                    color: 'bg-blue-100 text-blue-600',
                    iconColor: 'text-blue-600'
                }
            };

            const typeConfig = types[options.type] || types.default;
            this.confirmationIcon.className = `w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${typeConfig.color}`;
            this.confirmationIconType.className = `${typeConfig.icon} text-2xl ${typeConfig.iconColor}`;

            // Set warning if provided
            if (options.warning) {
                this.confirmationWarning.classList.remove('hidden');
                this.confirmationWarningText.textContent = options.warning;
            } else {
                this.confirmationWarning.classList.add('hidden');
            }

            // Set confirm button text and color
            this.confirmationConfirmBtn.textContent = options.confirmText || 'Confirm';
            
            if (options.type === 'approve') {
                this.confirmationConfirmBtn.className = 'flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-3 rounded-lg font-medium transition duration-200';
            } else if (options.type === 'reject') {
                this.confirmationConfirmBtn.className = 'flex-1 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white py-3 rounded-lg font-medium transition duration-200';
            } else {
                this.confirmationConfirmBtn.className = 'flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white py-3 rounded-lg font-medium transition duration-200';
            }

            // Show modal with animation
            this.confirmationModal.classList.remove('modal-hidden');
            setTimeout(() => {
                this.confirmationModal.querySelector('div').style.transform = 'scale(1)';
            }, 10);

            // Focus on cancel button for accessibility
            setTimeout(() => {
                this.confirmationCancelBtn.focus();
            }, 100);
        });
    }

    hideConfirmation(confirmed) {
        // Animate out
        this.confirmationModal.querySelector('div').style.transform = 'scale(0.95)';
        
        setTimeout(() => {
            this.confirmationModal.classList.add('modal-hidden');
            
            if (this.currentResolve) {
                if (confirmed) {
                    this.currentResolve({
                        confirmed: true,
                        userId: this.currentUserId,
                        action: this.currentAction
                    });
                } else {
                    this.currentResolve({
                        confirmed: false,
                        userId: this.currentUserId,
                        action: this.currentAction
                    });
                }
                
                this.currentResolve = null;
                this.currentReject = null;
                this.currentUserId = null;
                this.currentAction = null;
            }
        }, 200);
    }

    showSuccess(message) {
        this.successModalMessage.textContent = message;
        this.successModal.classList.remove('modal-hidden');
        
        setTimeout(() => {
            this.successModal.querySelector('div').style.transform = 'scale(1)';
        }, 10);

        // Auto-hide after 3 seconds
        setTimeout(() => {
            if (!this.successModal.classList.contains('modal-hidden')) {
                this.hideSuccess();
            }
        }, 3000);

        // Focus on OK button
        setTimeout(() => {
            this.successModalOkBtn.focus();
        }, 100);
    }

    hideSuccess() {
        this.successModal.querySelector('div').style.transform = 'scale(0.95)';
        
        setTimeout(() => {
            this.successModal.classList.add('modal-hidden');
        }, 200);
    }

    showError(message) {
        this.errorModalMessage.textContent = message;
        this.errorModal.classList.remove('modal-hidden');
        
        setTimeout(() => {
            this.errorModal.querySelector('div').style.transform = 'scale(1)';
        }, 10);

        // Focus on OK button
        setTimeout(() => {
            this.errorModalOkBtn.focus();
        }, 100);
    }

    hideError() {
        this.errorModal.querySelector('div').style.transform = 'scale(0.95)';
        
        setTimeout(() => {
            this.errorModal.classList.add('modal-hidden');
        }, 200);
    }

    showLoading(message = 'Processing...') {
        this.loadingModalMessage.textContent = message;
        this.loadingModal.classList.remove('modal-hidden');
        
        setTimeout(() => {
            this.loadingModal.querySelector('div').style.transform = 'scale(1)';
        }, 10);
    }

    hideLoading() {
        this.loadingModal.querySelector('div').style.transform = 'scale(0.95)';
        
        setTimeout(() => {
            this.loadingModal.classList.add('modal-hidden');
        }, 200);
    }

    // Convenience methods for common actions
    confirmApproveUser(userId, userName) {
        return this.showConfirmation({
            type: 'approve',
            title: 'Approve User',
            message: `Are you sure you want to approve ${userName || 'this user'}?`,
            warning: 'Once approved, the student ID photo will be permanently deleted.',
            confirmText: 'Approve',
            userId: userId,
            action: 'approve'
        });
    }

    confirmRejectUser(userId, userName) {
        return this.showConfirmation({
            type: 'reject',
            title: 'Reject User',
            message: `Are you sure you want to reject ${userName || 'this user'}?`,
            warning: 'Once rejected, the student ID photo will be permanently deleted.',
            confirmText: 'Reject',
            userId: userId,
            action: 'reject'
        });
    }
}

// Create global modal manager instance
window.modalManager = new ModalManager();