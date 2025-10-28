// Admin System
class AdminSystem {
    constructor() {
        this.auth = auth;
        this.currentAdmin = null;
        this.allUsers = [];
        this.init();
    }

    init() {
        this.checkAdminAuth();
        this.loadAllUsers();
        this.setupEventListeners();
        this.setupNavigation();
        this.updateOverview();
        this.loadUsersTable();
        this.loadTransactions();
        this.loadKYCRequests();
        this.loadPlans();
    }

    loadAllUsers() {
    console.log('Loading all users...');
    this.allUsers = this.auth.getAllUsers();
    console.log('Users loaded:', this.allUsers.length);
    
    // Debug: Check what's in localStorage
    const allStorageData = JSON.parse(localStorage.getItem('moneyPilotUsers')) || [];
    console.log('Raw storage data:', allStorageData);
}

checkAdminAuth() {
    console.log('Checking admin auth...');
    
    if (!this.auth.isLoggedIn()) {
        console.log('Not logged in, redirecting to admin login');
        window.location.href = 'admin-login.html';
        return;
    }

    this.currentAdmin = this.auth.getCurrentUser();
    console.log('Current admin:', this.currentAdmin);
    
    if (this.currentAdmin.role !== 'admin') {
        console.log('Not admin, redirecting to user dashboard');
        window.location.href = 'dashboard.html';
        return;
    }

    // Setup logout
    document.getElementById('adminLogoutBtn').addEventListener('click', () => {
        this.auth.logout();
    });
    
    console.log('Admin auth successful');
}

    setupEventListeners() {
        document.querySelectorAll('.admin-nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const targetSection = item.getAttribute('href').substring(1);
                document.querySelectorAll('.admin-nav-item').forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
                this.showSection(targetSection);
            });
        });

        document.getElementById('transactionFilter').addEventListener('change', () => {
            this.loadTransactions();
        });

        document.getElementById('userEditForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateUser();
        });

        document.getElementById('planEditForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updatePlan();
        });

        document.getElementById('generalSettings').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSettings();
        });

        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', () => {
                this.closeModals();
            });
        });

        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModals();
            }
        });
    }

    setupNavigation() {
        this.showSection('overview');
    }

    showSection(sectionId) {
        document.querySelectorAll('.admin-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(sectionId).classList.add('active');
    }

    updateOverview() {
        const totalUsers = this.allUsers.length;
        const totalInvestments = this.allUsers.reduce((sum, user) => 
            sum + (user.investments ? user.investments.filter(inv => inv.status === 'active').length : 0), 0);
        const totalDeposits = this.allUsers.reduce((sum, user) => 
            sum + (user.transactions ? user.transactions
                .filter(t => t.type === 'deposit' && t.status === 'completed')
                .reduce((s, t) => s + t.amount, 0) : 0), 0);
        const totalWithdrawals = this.allUsers.reduce((sum, user) => 
            sum + (user.transactions ? user.transactions
                .filter(t => t.type === 'withdrawal' && t.status === 'completed')
                .reduce((s, t) => s + Math.abs(t.amount), 0) : 0), 0);
        const pendingKYC = this.allUsers.filter(user => 
            user.kycSubmission && user.kycSubmission.status === 'pending').length;
        const systemBalance = this.allUsers.reduce((sum, user) => sum + user.balance, 0);

        document.getElementById('totalUsers').textContent = totalUsers;
        document.getElementById('totalInvestments').textContent = totalInvestments;
        document.getElementById('totalDeposits').textContent = `GHS ${totalDeposits.toFixed(2)}`;
        document.getElementById('totalWithdrawals').textContent = `GHS ${totalWithdrawals.toFixed(2)}`;
        document.getElementById('pendingKYC').textContent = pendingKYC;
        document.getElementById('systemBalance').textContent = `GHS ${systemBalance.toFixed(2)}`;

        this.updateRecentActivities();
    }

    updateRecentActivities() {
        const recentUsers = [...this.allUsers]
            .sort((a, b) => new Date(b.joinedDate) - new Date(a.joinedDate))
            .slice(0, 5);

        const registrationsHtml = recentUsers.map(user => `
            <div class="activity-item">
                <div>
                    <strong>${user.fullName}</strong>
                    <div class="text-muted">${user.email}</div>
                </div>
                <span>${new Date(user.joinedDate).toLocaleDateString()}</span>
            </div>
        `).join('');

        document.getElementById('recentRegistrations').innerHTML = registrationsHtml;

        const pendingDeposits = this.getAllTransactions()
            .filter(t => t.type === 'deposit' && t.status === 'pending').length;
        const pendingWithdrawals = this.getAllTransactions()
            .filter(t => t.type === 'withdrawal' && t.status === 'pending').length;

        const pendingActionsHtml = `
            <div class="activity-item">
                <span>Pending Deposits</span>
                <strong>${pendingDeposits}</strong>
            </div>
            <div class="activity-item">
                <span>Pending Withdrawals</span>
                <strong>${pendingWithdrawals}</strong>
            </div>
            <div class="activity-item">
                <span>KYC Verifications</span>
                <strong>${this.allUsers.filter(u => u.kycSubmission && u.kycSubmission.status === 'pending').length}</strong>
            </div>
        `;

        document.getElementById('pendingActions').innerHTML = pendingActionsHtml;
    }

    loadUsersTable() {
        const tbody = document.getElementById('usersTableBody');
        const html = this.allUsers.map(user => `
            <tr>
                <td>${user.id.substring(0, 8)}...</td>
                <td>${user.fullName}</td>
                <td>${user.email}</td>
                <td><span class="status-${user.plan}">${user.plan}</span></td>
                <td>GHS ${user.balance.toFixed(2)}</td>
                <td>
                    <span class="${user.kycVerified ? 'status-completed' : 'status-pending'}">
                        ${user.kycVerified ? 'Verified' : 'Pending'}
                    </span>
                </td>
                <td>${new Date(user.joinedDate).toLocaleDateString()}</td>
                <td>
                    <button class="btn-action" onclick="adminSystem.editUser('${user.id}')">Edit</button>
                    <button class="btn-action success" onclick="adminSystem.creditUser('${user.id}')">Credit</button>
                    <button class="btn-action danger" onclick="adminSystem.deleteUser('${user.id}')">Delete</button>
                </td>
            </tr>
        `).join('');

        tbody.innerHTML = html;
    }

    loadTransactions() {
        const filter = document.getElementById('transactionFilter').value;
        let transactions = this.getAllTransactions();

        if (filter !== 'all') {
            if (['deposit', 'withdrawal', 'investment'].includes(filter)) {
                transactions = transactions.filter(t => t.type === filter);
            } else if (['pending', 'completed'].includes(filter)) {
                transactions = transactions.filter(t => t.status === filter);
            }
        }

        const tbody = document.getElementById('transactionsTableBody');
        const html = transactions.map(transaction => {
            const user = this.allUsers.find(u => u.id === transaction.userId);
            
            let accountDetails = 'N/A';
            if (transaction.type === 'withdrawal') {
                const details = transaction.details || {};
                
                if (transaction.method && transaction.method.includes('mobile')) {
                    accountDetails = `
                        <div class="account-details">
                            <strong>Mobile:</strong> ${details.mobileNumber || transaction.mobileNumber || 'N/A'}<br>
                            <strong>Name:</strong> ${details.accountName || transaction.accountName || 'N/A'}
                        </div>
                    `;
                } else if (transaction.method === 'bank') {
                    accountDetails = `
                        <div class="account-details">
                            <strong>Bank:</strong> ${details.bankName || transaction.bankName || 'N/A'}<br>
                            <strong>Account:</strong> ${details.accountNumber || transaction.accountNumber || 'N/A'}<br>
                            <strong>Holder:</strong> ${details.accountHolder || transaction.accountHolder || 'N/A'}
                        </div>
                    `;
                } else if (transaction.method && transaction.method.includes('crypto')) {
                    accountDetails = `
                        <div class="account-details">
                            <strong>Address:</strong> ${details.address || transaction.cryptoAddress || 'N/A'}<br>
                            <strong>Network:</strong> ${details.network || transaction.cryptoNetwork || 'N/A'}
                        </div>
                    `;
                }
            }

            let fileDetails = 'N/A';
            if ((transaction.type === 'deposit' || transaction.type === 'withdrawal') && transaction.status === 'pending') {
                fileDetails = `
                    <div class="file-details">
                        <button class="btn-action small" onclick="adminSystem.viewUploadedFile('${transaction.id}')">
                            📎 View File
                        </button>
                    </div>
                `;
            }

            return `
                <tr>
                    <td>${transaction.id.substring(0, 8)}...</td>
                    <td>${user ? user.fullName : 'Unknown'}</td>
                    <td>${this.formatTransactionType(transaction.type)}</td>
                    <td class="${transaction.amount >= 0 ? 'status-completed' : 'status-pending'}">
                        ${transaction.amount >= 0 ? '+' : ''}GHS ${Math.abs(transaction.amount).toFixed(2)}
                    </td>
                    <td>
                        ${transaction.method || 'N/A'}
                        ${accountDetails !== 'N/A' ? accountDetails : ''}
                    </td>
                    <td>${fileDetails}</td>
                    <td><span class="status-${transaction.status}">${transaction.status}</span></td>
                    <td>${new Date(transaction.date).toLocaleDateString()}</td>
                    <td>
                        ${transaction.status === 'pending' ? `
                            <button class="btn-action success" onclick="adminSystem.approveTransaction('${transaction.id}')">Approve</button>
                            <button class="btn-action danger" onclick="adminSystem.rejectTransaction('${transaction.id}')">Reject</button>
                        ` : 'N/A'}
                    </td>
                </tr>
            `;
        }).join('');

        tbody.innerHTML = html;
    }

    getAllTransactions() {
        const allTransactions = [];
        this.allUsers.forEach(user => {
            if (user.transactions) {
                user.transactions.forEach(transaction => {
                    allTransactions.push({
                        ...transaction,
                        userId: user.id
                    });
                });
            }
        });
        return allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    viewUploadedFile(transactionId) {
        const users = JSON.parse(localStorage.getItem('moneyPilotUsers')) || [];
        let transaction = null;
        let user = null;

        users.forEach(u => {
            if (u.transactions) {
                const found = u.transactions.find(t => t.id === transactionId);
                if (found) {
                    transaction = found;
                    user = u;
                }
            }
        });

        if (!transaction) {
            alert('Transaction not found');
            return;
        }

        const modalContent = `
            <h3>Transaction File Details</h3>
            <div class="file-preview">
                <p><strong>User:</strong> ${user.fullName}</p>
                <p><strong>Transaction ID:</strong> ${transaction.id}</p>
                <p><strong>Type:</strong> ${this.formatTransactionType(transaction.type)}</p>
                <p><strong>Amount:</strong> GHS ${Math.abs(transaction.amount).toFixed(2)}</p>
                <p><strong>Method:</strong> ${transaction.method || 'N/A'}</p>
                <p><strong>Date:</strong> ${new Date(transaction.date).toLocaleString()}</p>
                <p><strong>File Status:</strong> Screenshot uploaded (demo)</p>
                <div class="demo-note">
                    <p>📝 <em>In a live system, the actual uploaded screenshot/file would be displayed here for verification.</em></p>
                </div>
            </div>
            <div class="modal-actions">
                <button class="btn-action success" onclick="adminSystem.approveTransaction('${transaction.id}')">Approve Transaction</button>
                <button class="btn-action danger" onclick="adminSystem.rejectTransaction('${transaction.id}')">Reject Transaction</button>
                <button class="btn-action" onclick="this.closest('.modal').style.display='none'">Close</button>
            </div>
        `;

        let modal = document.getElementById('fileViewModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'fileViewModal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <span class="close" onclick="this.closest('.modal').style.display='none'">&times;</span>
                    <div id="fileViewContent"></div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        document.getElementById('fileViewContent').innerHTML = modalContent;
        modal.style.display = 'block';
    }

    loadKYCRequests() {
        const pendingKYC = this.allUsers.filter(user => 
            user.kycSubmission && user.kycSubmission.status === 'pending');
        const container = document.getElementById('kycRequests');
        
        if (pendingKYC.length === 0) {
            container.innerHTML = '<p>No pending KYC requests</p>';
            return;
        }

        const html = pendingKYC.map(user => `
            <div class="kyc-request">
                <div class="kyc-user-info">
                    <h4>${user.fullName}</h4>
                    <p>Email: ${user.email} | Phone: ${user.phone}</p>
                    <p>ID Type: ${user.kycSubmission.idType} | ID Number: ${user.kycSubmission.idNumber}</p>
                    <p>Submitted: ${new Date(user.kycSubmission.submittedAt).toLocaleDateString()}</p>
                </div>
                <div class="kyc-documents">
                    <div class="document-preview">
                        <p>Front ID</p>
                        <div class="document-placeholder">📄 ${user.kycSubmission.documents.frontId}</div>
                    </div>
                    <div class="document-preview">
                        <p>Back ID</p>
                        <div class="document-placeholder">📄 ${user.kycSubmission.documents.backId}</div>
                    </div>
                    <div class="document-preview">
                        <p>Selfie with ID</p>
                        <div class="document-placeholder">📸 ${user.kycSubmission.documents.selfie}</div>
                    </div>
                </div>
                <div class="kyc-actions">
                    <button class="btn-action success" onclick="adminSystem.approveKYC('${user.id}')">Approve</button>
                    <button class="btn-action danger" onclick="adminSystem.rejectKYC('${user.id}')">Reject</button>
                    <button class="btn-action" onclick="adminSystem.viewUser('${user.id}')">View User</button>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    loadPlans() {
        const plans = [
            { id: 'free', name: 'Starter', amount: 0, return: 20, period: 0, limit: 20 },
            { id: 'bronze', name: 'Bronze', amount: 500, return: 2325.23, period: 3, limit: 5000 },
            { id: 'silver', name: 'Silver', amount: 900, return: 4185.41, period: 3, limit: 10000 },
            { id: 'gold', name: 'Gold', amount: 1700, return: 7905.78, period: 5, limit: 15000 },
            { id: 'platinum', name: 'Platinum', amount: 3000, return: 13951.38, period: 6, limit: 20000 }
        ];

        const container = document.getElementById('plansList');
        const html = plans.map(plan => `
            <div class="plan-admin-card" onclick="adminSystem.selectPlan('${plan.id}')">
                <h4>${plan.name}</h4>
                <div class="plan-details">
                    <div class="plan-detail"><strong>Investment:</strong> GHS ${plan.amount}</div>
                    <div class="plan-detail"><strong>Return:</strong> GHS ${plan.return}</div>
                    <div class="plan-detail"><strong>Period:</strong> ${plan.period} weeks</div>
                    <div class="plan-detail"><strong>Limit:</strong> GHS ${plan.limit}</div>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    editUser(userId) {
        const user = this.allUsers.find(u => u.id === userId);
        if (!user) return;

        document.getElementById('editUserId').value = user.id;
        document.getElementById('editUserName').value = user.fullName;
        document.getElementById('editUserEmail').value = user.email;
        document.getElementById('editUserPhone').value = user.phone;
        document.getElementById('editUserBalance').value = user.balance;
        document.getElementById('editUserPlan').value = user.plan;
        document.getElementById('editUserKYC').value = user.kycVerified.toString();

        document.getElementById('userEditModal').style.display = 'block';
    }

    updateUser() {
        const userId = document.getElementById('editUserId').value;
        const updates = {
            fullName: document.getElementById('editUserName').value,
            email: document.getElementById('editUserEmail').value,
            phone: document.getElementById('editUserPhone').value,
            balance: parseFloat(document.getElementById('editUserBalance').value),
            plan: document.getElementById('editUserPlan').value,
            kycVerified: document.getElementById('editUserKYC').value === 'true'
        };

        if (this.auth.updateUser(userId, updates)) {
            alert('User updated successfully!');
            this.closeModals();
            this.loadAllUsers();
            this.loadUsersTable();
            this.updateOverview();
        } else {
            alert('Error updating user');
        }
    }

    creditUser(userId) {
        const amount = prompt('Enter credit amount (GHS):');
        if (!amount || isNaN(amount) || amount <= 0) return;

        const user = this.allUsers.find(u => u.id === userId);
        if (!user) return;

        const creditAmount = parseFloat(amount);
        const newBalance = user.balance + creditAmount;

        const transaction = {
            id: this.generateId(),
            type: 'deposit',
            amount: creditAmount,
            method: 'admin_credit',
            description: 'Admin credit',
            date: new Date().toISOString(),
            status: 'completed'
        };

        if (!user.transactions) user.transactions = [];
        user.transactions.push(transaction);

        if (this.auth.updateUser(userId, {
            balance: newBalance,
            transactions: user.transactions
        })) {
            alert(`Successfully credited GHS ${creditAmount.toFixed(2)} to user`);
            this.loadAllUsers();
            this.loadUsersTable();
            this.updateOverview();
        }
    }

    deleteUser(userId) {
        if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            const users = JSON.parse(localStorage.getItem('moneyPilotUsers')) || [];
            const updatedUsers = users.filter(user => user.id !== userId);
            localStorage.setItem('moneyPilotUsers', JSON.stringify(updatedUsers));
            alert('User deleted successfully');
            this.loadAllUsers();
            this.loadUsersTable();
            this.updateOverview();
        }
    }

    approveTransaction(transactionId) {
        this.updateTransactionStatus(transactionId, 'completed', true);
    }

    rejectTransaction(transactionId) {
        this.updateTransactionStatus(transactionId, 'rejected', false);
    }

    updateTransactionStatus(transactionId, status, shouldUpdateBalance) {
        const users = JSON.parse(localStorage.getItem('moneyPilotUsers')) || [];
        let transactionFound = false;

        users.forEach(user => {
            if (user.transactions) {
                user.transactions.forEach(transaction => {
                    if (transaction.id === transactionId && transaction.status === 'pending') {
                        transaction.status = status;
                        if (shouldUpdateBalance && transaction.type === 'deposit' && status === 'completed') {
                            user.balance += transaction.amount;
                        }
                        transactionFound = true;
                    }
                });
            }
        });

        if (transactionFound) {
            localStorage.setItem('moneyPilotUsers', JSON.stringify(users));
            alert(`Transaction ${status} successfully`);
            this.loadAllUsers();
            this.loadTransactions();
            this.updateOverview();
        } else {
            alert('Transaction not found or already processed');
        }
    }

    approveKYC(userId) {
        if (this.auth.updateUser(userId, { kycVerified: true })) {
            alert('KYC approved successfully');
            this.loadAllUsers();
            this.loadKYCRequests();
            this.loadUsersTable();
        }
    }

    rejectKYC(userId) {
        if (this.auth.updateUser(userId, { 
            kycVerified: false,
            kycSubmission: null
        })) {
            alert('KYC rejected');
            this.loadAllUsers();
            this.loadKYCRequests();
            this.loadUsersTable();
        }
    }

    selectPlan(planId) {
        const plans = {
            'free': { name: 'Starter', amount: 0, return: 20, period: 0, limit: 20 },
            'bronze': { name: 'Bronze', amount: 500, return: 2325.23, period: 3, limit: 5000 },
            'silver': { name: 'Silver', amount: 900, return: 4185.41, period: 3, limit: 10000 },
            'gold': { name: 'Gold', amount: 1700, return: 7905.78, period: 5, limit: 15000 },
            'platinum': { name: 'Platinum', amount: 3000, return: 13951.38, period: 6, limit: 20000 }
        };

        const plan = plans[planId];
        if (!plan) return;

        document.getElementById('editPlanName').value = plan.name;
        document.getElementById('editPlanAmount').value = plan.amount;
        document.getElementById('editPlanReturn').value = plan.return;
        document.getElementById('editPlanPeriod').value = plan.period;
        document.getElementById('editPlanLimit').value = plan.limit;
    }

    updatePlan() {
        alert('Plan updated successfully (demo - in real app this would save to database)');
    }

    saveSettings() {
        alert('Settings saved successfully (demo)');
    }

    searchUsers() {
        const query = document.getElementById('userSearch').value.toLowerCase();
        const filteredUsers = this.allUsers.filter(user => 
            user.fullName.toLowerCase().includes(query) ||
            user.email.toLowerCase().includes(query) ||
            user.phone.includes(query)
        );

        const tbody = document.getElementById('usersTableBody');
        const html = filteredUsers.map(user => `
            <tr>
                <td>${user.id.substring(0, 8)}...</td>
                <td>${user.fullName}</td>
                <td>${user.email}</td>
                <td><span class="status-${user.plan}">${user.plan}</span></td>
                <td>GHS ${user.balance.toFixed(2)}</td>
                <td>
                    <span class="${user.kycVerified ? 'status-completed' : 'status-pending'}">
                        ${user.kycVerified ? 'Verified' : 'Pending'}
                    </span>
                </td>
                <td>${new Date(user.joinedDate).toLocaleDateString()}</td>
                <td>
                    <button class="btn-action" onclick="adminSystem.editUser('${user.id}')">Edit</button>
                    <button class="btn-action success" onclick="adminSystem.creditUser('${user.id}')">Credit</button>
                    <button class="btn-action danger" onclick="adminSystem.deleteUser('${user.id}')">Delete</button>
                </td>
            </tr>
        `).join('');

        tbody.innerHTML = html;
    }

    exportUserData() {
        const dataStr = JSON.stringify(this.allUsers, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `moneypilot-users-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
    }

    backupSystem() {
        const systemData = {
            users: this.allUsers,
            backupDate: new Date().toISOString()
        };
        const dataStr = JSON.stringify(systemData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `moneypilot-backup-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
    }

    clearTestData() {
        if (confirm('Are you sure you want to clear all test data? This cannot be undone.')) {
            localStorage.removeItem('moneyPilotUsers');
            localStorage.removeItem('currentMoneyPilotUser');
            alert('Test data cleared. Redirecting to login...');
            setTimeout(() => {
                window.location.href = 'admin-login.html';
            }, 2000);
        }
    }

    formatTransactionType(type) {
        const types = {
            'deposit': 'Deposit',
            'withdrawal': 'Withdrawal',
            'investment': 'Investment',
            'profit': 'Profit',
            'referral_bonus': 'Referral Bonus',
            'referral_commission': 'Referral Commission'
        };
        return types[type] || type;
    }

    closeModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
}

let adminSystem;
document.addEventListener('DOMContentLoaded', () => {
    adminSystem = new AdminSystem();

});

// Add to AdminSystem class
debugSystem() {
    const output = document.getElementById('debugOutput');
    let debugInfo = '';
    
    // Check localStorage
    const moneyPilotUsers = JSON.parse(localStorage.getItem('moneyPilotUsers')) || [];
    const moneypilotUsers = JSON.parse(localStorage.getItem('moneypilot_users')) || [];
    const currentUser = JSON.parse(localStorage.getItem('currentMoneyPilotUser')) || 'Not found';
    
    debugInfo += `=== LOCALSTORAGE CHECK ===\n`;
    debugInfo += `moneyPilotUsers: ${moneyPilotUsers.length} users\n`;
    debugInfo += `moneypilot_users: ${moneypilotUsers.length} users\n`;
    debugInfo += `Current user: ${currentUser.email || 'Not logged in'}\n\n`;
    
    debugInfo += `=== ADMIN SYSTEM CHECK ===\n`;
    debugInfo += `All Users: ${this.allUsers.length}\n`;
    debugInfo += `Current Admin: ${this.currentAdmin ? this.currentAdmin.email : 'None'}\n`;
    debugInfo += `Auth Status: ${this.auth.isLoggedIn() ? 'Logged In' : 'Logged Out'}\n\n`;
    
    debugInfo += `=== USER LIST ===\n`;
    this.allUsers.forEach((user, index) => {
        debugInfo += `${index + 1}. ${user.email} (${user.role}) - Balance: GHS ${user.balance}\n`;
    });
    
    output.textContent = debugInfo;
    console.log('Debug info:', debugInfo);
}
