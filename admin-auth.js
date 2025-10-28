// Admin Authentication System
class AdminAuthSystem {
    constructor() {
        this.auth = auth;
        this.init();
    }

    init() {
        this.checkAdminRoutes();
    }

    checkAdminRoutes() {
        // Check if current page is an admin page
        const isAdminPage = window.location.pathname.includes('admin-');
        
        if (isAdminPage && !this.isAdminAuthenticated()) {
            window.location.href = 'admin-login.html';
            return;
        }

        // If on admin login page but already authenticated, redirect to admin dashboard
        if (window.location.pathname.includes('admin-login.html') && this.isAdminAuthenticated()) {
            window.location.href = 'admin-dashboard.html';
        }
    }

    isAdminAuthenticated() {
        if (!this.auth.isLoggedIn()) {
            return false;
        }

        const currentUser = this.auth.getCurrentUser();
        return currentUser.role === 'admin';
    }

    // Admin-specific authentication methods
    validateAdminAction(action, data) {
        if (!this.isAdminAuthenticated()) {
            throw new Error('Admin authentication required');
        }

        // Add additional admin action validation here
        switch (action) {
            case 'edit_user_balance':
                return this.validateBalanceEdit(data);
            case 'approve_transaction':
                return this.validateTransactionApproval(data);
            case 'manage_plans':
                return this.validatePlanManagement(data);
            default:
                return true;
        }
    }

    validateBalanceEdit(data) {
        if (!data.userId || typeof data.amount !== 'number') {
            throw new Error('Invalid balance edit data');
        }
        
        if (data.amount < 0 || data.amount > 1000000) { // Maximum GHS 1,000,000
            throw new Error('Balance amount out of acceptable range');
        }
        
        return true;
    }

    validateTransactionApproval(data) {
        if (!data.transactionId || !data.action) {
            throw new Error('Invalid transaction approval data');
        }
        
        const validActions = ['approve', 'reject'];
        if (!validActions.includes(data.action)) {
            throw new Error('Invalid transaction action');
        }
        
        return true;
    }

    validatePlanManagement(data) {
        if (!data.planId || typeof data.changes !== 'object') {
            throw new Error('Invalid plan management data');
        }
        
        const validPlans = ['free', 'bronze', 'silver', 'gold', 'platinum'];
        if (!validPlans.includes(data.planId)) {
            throw new Error('Invalid plan ID');
        }
        
        // Validate plan changes
        const allowedFields = ['investment', 'return', 'period', 'limit', 'active'];
        for (const field in data.changes) {
            if (!allowedFields.includes(field)) {
                throw new Error(`Invalid field in plan changes: ${field}`);
            }
        }
        
        return true;
    }

    // Admin session management
    getAdminSession() {
        if (!this.isAdminAuthenticated()) {
            return null;
        }

        const currentUser = this.auth.getCurrentUser();
        return {
            id: currentUser.id,
            email: currentUser.email,
            name: currentUser.fullName,
            loginTime: currentUser.lastLogin || new Date().toISOString(),
            permissions: this.getAdminPermissions()
        };
    }

    getAdminPermissions() {
        // Define admin permissions based on role (could be extended for multiple admin levels)
        return {
            canManageUsers: true,
            canManageTransactions: true,
            canManagePlans: true,
            canManageKYC: true,
            canManageSettings: true,
            canExportData: true,
            canCreditUsers: true
        };
    }

    // Admin activity logging
    logAdminAction(action, details) {
        if (!this.isAdminAuthenticated()) {
            return;
        }

        const adminSession = this.getAdminSession();
        const logEntry = {
            adminId: adminSession.id,
            adminEmail: adminSession.email,
            action: action,
            details: details,
            timestamp: new Date().toISOString(),
            ipAddress: this.getClientIP() // This would be server-side in production
        };

        // In a real application, this would be sent to a server
        console.log('Admin Action:', logEntry);
        
        // Store in localStorage for demo purposes
        this.storeAdminLog(logEntry);
    }

    storeAdminLog(logEntry) {
        const adminLogs = JSON.parse(localStorage.getItem('moneyPilotAdminLogs')) || [];
        adminLogs.push(logEntry);
        
        // Keep only last 1000 logs
        if (adminLogs.length > 1000) {
            adminLogs.splice(0, adminLogs.length - 1000);
        }
        
        localStorage.setItem('moneyPilotAdminLogs', JSON.stringify(adminLogs));
    }

    getAdminLogs(limit = 100) {
        const adminLogs = JSON.parse(localStorage.getItem('moneyPilotAdminLogs')) || [];
        return adminLogs.slice(-limit).reverse();
    }

    getClientIP() {
        // This is a demo function - in production, IP would be detected server-side
        return 'demo-ip-address';
    }

    // Admin security functions
    validateAdminPassword(password) {
        // In production, this would use proper password validation
        if (!password || password.length < 8) {
            return { valid: false, message: 'Password must be at least 8 characters long' };
        }
        
        // Add more password strength checks as needed
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        
        if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
            return {
                valid: false,
                message: 'Password must contain uppercase, lowercase, numbers, and special characters'
            };
        }
        
        return { valid: true, message: 'Password is strong' };
    }

    // Force logout all users (admin function)
    forceLogoutAllUsers() {
        // This would typically be a server-side function
        // For demo, we'll just clear current user sessions
        localStorage.removeItem('currentMoneyPilotUser');
        
        // Log the action
        this.logAdminAction('force_logout_all', {
            reason: 'Admin initiated mass logout',
            affectedUsers: 'all'
        });
        
        return true;
    }

    // Get admin dashboard statistics
    getAdminDashboardStats() {
        const users = JSON.parse(localStorage.getItem('moneyPilotUsers')) || [];
        const regularUsers = users.filter(user => user.role !== 'admin');
        
        const stats = adminData.getSystemStats();
        const recentActivities = this.getRecentAdminActivities(10);
        
        return {
            ...stats,
            recentRegistrations: this.getRecentRegistrations(5),
            pendingActions: this.getPendingActions(),
            systemHealth: this.getSystemHealth(),
            recentAdminActivities: recentActivities
        };
    }

    getRecentRegistrations(limit = 5) {
        const users = JSON.parse(localStorage.getItem('moneyPilotUsers')) || [];
        const regularUsers = users.filter(user => user.role !== 'admin');
        
        return regularUsers
            .sort((a, b) => new Date(b.joinedDate) - new Date(a.joinedDate))
            .slice(0, limit)
            .map(user => ({
                id: user.id,
                name: user.fullName,
                email: user.email,
                plan: user.plan,
                joinedDate: user.joinedDate,
                kycStatus: user.kycVerified ? 'verified' : 'pending'
            }));
    }

    getPendingActions() {
        const users = JSON.parse(localStorage.getItem('moneyPilotUsers')) || [];
        
        let pendingDeposits = 0;
        let pendingWithdrawals = 0;
        let pendingKYC = 0;

        users.forEach(user => {
            if (user.transactions) {
                user.transactions.forEach(transaction => {
                    if (transaction.status === 'pending') {
                        if (transaction.type === 'deposit') pendingDeposits++;
                        if (transaction.type === 'withdrawal') pendingWithdrawals++;
                    }
                });
            }
            
            if (user.kycSubmission && user.kycSubmission.status === 'pending') {
                pendingKYC++;
            }
        });

        return {
            pendingDeposits,
            pendingWithdrawals,
            pendingKYC,
            totalPending: pendingDeposits + pendingWithdrawals + pendingKYC
        };
    }

    getSystemHealth() {
        // This would typically check various system metrics
        // For demo, we'll return mock data
        return {
            status: 'healthy',
            uptime: '99.9%',
            lastBackup: new Date().toISOString(),
            activeUsers: this.getActiveUsersCount(),
            systemLoad: 'low'
        };
    }

    getActiveUsersCount() {
        // In a real application, this would track active sessions
        // For demo, we'll return a random number
        const users = JSON.parse(localStorage.getItem('moneyPilotUsers')) || [];
        return Math.min(users.length, Math.floor(Math.random() * 50) + 10);
    }

    getRecentAdminActivities(limit = 10) {
        return this.getAdminLogs(limit);
    }
}

// Initialize admin auth system
const adminAuth = new AdminAuthSystem();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { adminAuth };
}