// Admin Data Management System
class AdminDataSystem {
    constructor() {
        this.systemData = this.loadSystemData();
    }

    loadSystemData() {
        return JSON.parse(localStorage.getItem('moneyPilotSystemData')) || {
            settings: {
                siteName: 'MoneyPilot',
                adminEmail: 'admin@moneypilot.site',
                exchangeRate: 12.5,
                maintenanceMode: false,
                registrationEnabled: true,
                withdrawalsEnabled: true
            },
            plans: {
                free: {
                    name: 'Starter',
                    investment: 0,
                    return: 20,
                    period: 0,
                    limit: 20,
                    active: true
                },
                bronze: {
                    name: 'Bronze',
                    investment: 500,
                    return: 2325.23,
                    period: 3,
                    limit: 5000,
                    active: true
                },
                silver: {
                    name: 'Silver',
                    investment: 900,
                    return: 4185.41,
                    period: 3,
                    limit: 10000,
                    active: true
                },
                gold: {
                    name: 'Gold',
                    investment: 1700,
                    return: 7905.78,
                    period: 5,
                    limit: 15000,
                    active: true
                },
                platinum: {
                    name: 'Platinum',
                    investment: 3000,
                    return: 13951.38,
                    period: 6,
                    limit: 20000,
                    active: true
                }
            },
            statistics: {
                totalUsers: 0,
                totalDeposits: 0,
                totalWithdrawals: 0,
                totalInvestments: 0,
                systemBalance: 0,
                createdAt: new Date().toISOString()
            }
        };
    }

    saveSystemData() {
        localStorage.setItem('moneyPilotSystemData', JSON.stringify(this.systemData));
    }

    updateSettings(newSettings) {
        this.systemData.settings = { ...this.systemData.settings, ...newSettings };
        this.saveSystemData();
        return true;
    }

    updatePlan(planId, planData) {
        if (this.systemData.plans[planId]) {
            this.systemData.plans[planId] = { ...this.systemData.plans[planId], ...planData };
            this.saveSystemData();
            return true;
        }
        return false;
    }

    getSystemStats() {
        const users = JSON.parse(localStorage.getItem('moneyPilotUsers')) || [];
        const regularUsers = users.filter(user => user.role !== 'admin');
        
        let totalDeposits = 0;
        let totalWithdrawals = 0;
        let totalInvestments = 0;
        let systemBalance = 0;

        regularUsers.forEach(user => {
            systemBalance += user.balance || 0;
            
            if (user.transactions) {
                user.transactions.forEach(transaction => {
                    if (transaction.type === 'deposit' && transaction.status === 'completed') {
                        totalDeposits += transaction.amount;
                    } else if (transaction.type === 'withdrawal' && transaction.status === 'completed') {
                        totalWithdrawals += Math.abs(transaction.amount);
                    } else if (transaction.type === 'investment') {
                        totalInvestments += Math.abs(transaction.amount);
                    }
                });
            }
        });

        return {
            totalUsers: regularUsers.length,
            totalDeposits,
            totalWithdrawals,
            totalInvestments,
            systemBalance,
            activeInvestments: regularUsers.reduce((sum, user) => 
                sum + (user.investments ? user.investments.filter(inv => inv.status === 'active').length : 0), 0),
            pendingKYC: regularUsers.filter(user => 
                user.kycSubmission && user.kycSubmission.status === 'pending').length
        };
    }

    // Backup and restore functions
    createBackup() {
        const backupData = {
            users: JSON.parse(localStorage.getItem('moneyPilotUsers')) || [],
            systemData: this.systemData,
            timestamp: new Date().toISOString(),
            version: '1.0'
        };
        return backupData;
    }

    restoreBackup(backupData) {
        try {
            if (backupData.users) {
                localStorage.setItem('moneyPilotUsers', JSON.stringify(backupData.users));
            }
            if (backupData.systemData) {
                localStorage.setItem('moneyPilotSystemData', JSON.stringify(backupData.systemData));
                this.systemData = backupData.systemData;
            }
            return true;
        } catch (error) {
            console.error('Backup restoration failed:', error);
            return false;
        }
    }

    // User management helpers
    getUserStats(userId) {
        const users = JSON.parse(localStorage.getItem('moneyPilotUsers')) || [];
        const user = users.find(u => u.id === userId);
        
        if (!user) return null;

        let totalDeposits = 0;
        let totalWithdrawals = 0;
        let totalInvested = 0;
        let referralEarnings = 0;

        if (user.transactions) {
            user.transactions.forEach(transaction => {
                switch (transaction.type) {
                    case 'deposit':
                        if (transaction.status === 'completed') {
                            totalDeposits += transaction.amount;
                        }
                        break;
                    case 'withdrawal':
                        totalWithdrawals += Math.abs(transaction.amount);
                        break;
                    case 'investment':
                        totalInvested += Math.abs(transaction.amount);
                        break;
                    case 'referral_bonus':
                    case 'referral_commission':
                        referralEarnings += transaction.amount;
                        break;
                }
            });
        }

        return {
            totalDeposits,
            totalWithdrawals,
            totalInvested,
            referralEarnings,
            currentBalance: user.balance || 0,
            activeInvestments: user.investments ? user.investments.filter(inv => inv.status === 'active').length : 0,
            totalReferrals: users.filter(u => u.referredBy === user.referralCode).length
        };
    }

    // System maintenance functions
    enableMaintenanceMode() {
        this.updateSettings({ maintenanceMode: true });
    }

    disableMaintenanceMode() {
        this.updateSettings({ maintenanceMode: false });
    }

    // Data export functions
    exportUserDataCSV() {
        const users = JSON.parse(localStorage.getItem('moneyPilotUsers')) || [];
        const regularUsers = users.filter(user => user.role !== 'admin');
        
        let csv = 'User ID,Name,Email,Phone,Plan,Balance,KYC Verified,Joined Date,Total Deposits,Total Withdrawals,Referral Code\n';
        
        regularUsers.forEach(user => {
            const stats = this.getUserStats(user.id);
            const row = [
                user.id,
                `"${user.fullName}"`,
                user.email,
                user.phone,
                user.plan,
                user.balance || 0,
                user.kycVerified ? 'Yes' : 'No',
                new Date(user.joinedDate).toLocaleDateString(),
                stats?.totalDeposits || 0,
                stats?.totalWithdrawals || 0,
                user.referralCode
            ].join(',');
            
            csv += row + '\n';
        });
        
        return csv;
    }

    exportTransactionDataCSV() {
        const users = JSON.parse(localStorage.getItem('moneyPilotUsers')) || [];
        let csv = 'Transaction ID,User ID,Type,Amount,Method,Status,Date,Description\n';
        
        users.forEach(user => {
            if (user.transactions) {
                user.transactions.forEach(transaction => {
                    const row = [
                        transaction.id,
                        user.id,
                        transaction.type,
                        transaction.amount,
                        transaction.method || 'N/A',
                        transaction.status,
                        new Date(transaction.date).toISOString(),
                        `"${transaction.description || ''}"`
                    ].join(',');
                    
                    csv += row + '\n';
                });
            }
        });
        
        return csv;
    }
}

// Initialize admin data system
const adminData = new AdminDataSystem();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { adminData };
}