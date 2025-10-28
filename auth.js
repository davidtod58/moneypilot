// Authentication System
class AuthSystem {
    constructor() {
        this.users = JSON.parse(localStorage.getItem('moneyPilotUsers')) || [];
        this.currentUser = JSON.parse(localStorage.getItem('currentMoneyPilotUser')) || null;
        this.init();
    }

    init() {
        // Create default admin user if none exists
        if (!this.users.find(user => user.email === 'admin@moneypilot.site')) {
            this.users.push({
                id: this.generateId(),
                email: 'admin@moneypilot.site',
                password: this.hashPassword('admin123'),
                phone: '+233000000000',
                fullName: 'System Administrator',
                role: 'admin',
                balance: 0,
                plan: 'admin',
                kycVerified: true,
                joinedDate: new Date().toISOString()
            });
            this.saveUsers();
        }
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    hashPassword(password) {
        // Simple hash for demo purposes - in production use proper hashing
        return btoa(password);
    }

    verifyPassword(password, hash) {
        return btoa(password) === hash;
    }

    saveUsers() {
        localStorage.setItem('moneyPilotUsers', JSON.stringify(this.users));
    }

    register(userData) {
        // Check if user already exists
        if (this.users.find(user => user.email === userData.email)) {
            return { success: false, message: 'User already exists with this email' };
        }

        const newUser = {
            id: this.generateId(),
            email: userData.email,
            phone: userData.phone,
            password: this.hashPassword(userData.password),
            fullName: userData.fullName,
            role: 'user',
            balance: 0,
            plan: 'free',
            kycVerified: false,
            referralCode: this.generateReferralCode(),
            referredBy: userData.referralCode || null,
            joinedDate: new Date().toISOString(),
            investments: [],
            transactions: []
        };

        this.users.push(newUser);
        this.saveUsers();

        // Handle referral bonus
        if (userData.referralCode) {
            this.processReferralBonus(userData.referralCode, newUser.id);
        }

        return { success: true, message: 'Registration successful' };
    }

    generateReferralCode() {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    processReferralBonus(referralCode, newUserId) {
        const referrer = this.users.find(user => user.referralCode === referralCode);
        if (referrer) {
            // Add referral bonus
            referrer.balance += 24; // GHS 24 bonus
            
            // Add transaction record
            referrer.transactions.push({
                id: this.generateId(),
                type: 'referral_bonus',
                amount: 24,
                description: `Referral bonus for new user ${newUserId}`,
                date: new Date().toISOString(),
                status: 'completed'
            });
            
            this.saveUsers();
        }
    }

    login(email, password) {
        const user = this.users.find(u => u.email === email);
        if (!user) {
            return { success: false, message: 'User not found' };
        }

        if (!this.verifyPassword(password, user.password)) {
            return { success: false, message: 'Invalid password' };
        }

        this.currentUser = user;
        localStorage.setItem('currentMoneyPilotUser', JSON.stringify(user));
        
        return { 
            success: true, 
            message: 'Login successful',
            user: user
        };
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('currentMoneyPilotUser');
        window.location.href = 'index.html';
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isLoggedIn() {
        return this.currentUser !== null;
    }

    updateUser(userId, updates) {
        const userIndex = this.users.findIndex(user => user.id === userId);
        if (userIndex !== -1) {
            this.users[userIndex] = { ...this.users[userIndex], ...updates };
            this.saveUsers();
            
            // Update current user if it's the same user
            if (this.currentUser && this.currentUser.id === userId) {
                this.currentUser = this.users[userIndex];
                localStorage.setItem('currentMoneyPilotUser', JSON.stringify(this.currentUser));
            }
            
            return true;
        }
        return false;
    }

    getUserById(userId) {
        return this.users.find(user => user.id === userId);
    }

    getAllUsers() {
        return this.users.filter(user => user.role === 'user');
    }
}

// Initialize auth system
const auth = new AuthSystem();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { auth };
}