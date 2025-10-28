// Dashboard Functionality
class Dashboard {
    constructor() {
        this.auth = auth;
        this.currentUser = null;
        console.log('Dashboard initialized');
        console.log('Auth status:', this.auth.isLoggedIn());
        this.init();
    }

    init() {
        this.checkAuthentication();
        this.loadUserData();
        this.setupEventListeners();
        this.setupNavigation();
        this.updateDashboard();
    }

 checkAuthentication() {
    if (!this.auth.isLoggedIn()) {
        window.location.href = 'login.html';
        return;
    }

    this.currentUser = this.auth.getCurrentUser();
    
    // Ensure we have the latest user data from localStorage
    const users = JSON.parse(localStorage.getItem('moneyPilotUsers')) || [];
    const freshUserData = users.find(user => user.id === this.currentUser.id);
    
    if (freshUserData) {
        this.currentUser = freshUserData;
        // Update the current user in auth system
        localStorage.setItem('currentMoneyPilotUser', JSON.stringify(freshUserData));
    }
    
    if (this.currentUser.role === 'admin') {
        window.location.href = 'admin-dashboard.html';
    }
}

   loadUserData() {
    if (!this.currentUser) {
        console.error('No user data available');
        return;
    }
    
    try {
        // Update user info in sidebar
        document.getElementById('userName').textContent = this.currentUser.fullName || 'User';
        document.getElementById('userPlan').textContent = this.currentUser.plan ? 
            this.currentUser.plan.charAt(0).toUpperCase() + this.currentUser.plan.slice(1) : 'Free';
        document.getElementById('userBalance').textContent = `Balance: GHS ${(this.currentUser.balance || 0).toFixed(2)}`;
        
        // Update profile information
        document.getElementById('profileName').value = this.currentUser.fullName || '';
        document.getElementById('profileEmail').value = this.currentUser.email || '';
        document.getElementById('profilePhone').value = this.currentUser.phone || '';
        document.getElementById('profileReferralCode').value = this.currentUser.referralCode || '';
        
        // Update KYC status
        const kycStatus = document.getElementById('kycStatus');
        if (kycStatus) {
            kycStatus.textContent = `Status: ${this.currentUser.kycVerified ? 'Verified' : 'Not Verified'}`;
            kycStatus.className = this.currentUser.kycVerified ? 'status-verified' : 'status-pending';
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

    setupEventListeners() {
        // Logout button
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.auth.logout();
        });

        // Investment buttons
        document.querySelectorAll('.invest-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                this.openInvestmentModal(e.target);
            });
        });

        // Confirm investment
        document.getElementById('confirmInvestment').addEventListener('click', () => {
            this.processInvestment();
        });

        // Copy referral link
        document.getElementById('copyLinkBtn').addEventListener('click', () => {
            this.copyReferralLink();
        });

        // Share buttons
        document.querySelectorAll('.share-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                this.shareReferralLink(e.target.dataset.platform);
            });
        });

        // Navigation links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetSection = link.getAttribute('href').substring(1);
                this.showSection(targetSection);
            });
        });

        // Close modal
        document.querySelector('.close').addEventListener('click', () => {
            this.closeModal();
        });

        // Modal background click
        window.addEventListener('click', (e) => {
            if (e.target === document.getElementById('investmentModal')) {
                this.closeModal();
            }
        });
    }

    setupNavigation() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const targetSection = item.getAttribute('href').substring(1);
                
                // Update active states
                document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
                
                this.showSection(targetSection);
            });
        });
    }

    showSection(sectionId) {
        // Hide all sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Show target section
        document.getElementById(sectionId).classList.add('active');
    }

    updateDashboard() {
        this.updateBalance();
        this.updateInvestmentStats();
        this.updateReferralStats();
        this.updateRecentTransactions();
        this.updateReferralLink();
    }

    updateBalance() {
        document.getElementById('totalBalance').textContent = `GHS ${this.currentUser.balance.toFixed(2)}`;
    }

    updateInvestmentStats() {
        const activeInvestments = this.currentUser.investments ? 
            this.currentUser.investments.filter(inv => inv.status === 'active').length : 0;
        
        const totalProfit = this.currentUser.transactions ? 
            this.currentUser.transactions
                .filter(t => t.type === 'profit')
                .reduce((sum, t) => sum + t.amount, 0) : 0;

        document.getElementById('activeInvestments').textContent = activeInvestments;
        document.getElementById('totalProfit').textContent = `GHS ${totalProfit.toFixed(2)}`;
    }

   updateReferralStats() {
    // Calculate referral earnings
    const referralEarnings = this.currentUser.transactions ?
        this.currentUser.transactions
            .filter(t => t.type === 'referral_bonus' || t.type === 'referral_commission')
            .reduce((sum, t) => sum + t.amount, 0) : 0;

    // Calculate total referrals
    const users = JSON.parse(localStorage.getItem('moneyPilotUsers')) || [];
    const totalReferrals = users.filter(user => 
        user.referredBy === this.currentUser.referralCode
    ).length;

    // Calculate pending bonus (users who signed up but haven't invested yet)
    const pendingReferrals = users.filter(user => 
        user.referredBy === this.currentUser.referralCode && 
        user.plan === 'free'
    ).length;
    const pendingBonus = pendingReferrals * 24; // GHS 24 per pending referral

    // Update the DOM
    document.getElementById('referralEarnings').textContent = `GHS ${referralEarnings.toFixed(2)}`;
    document.getElementById('totalReferralEarnings').textContent = `GHS ${referralEarnings.toFixed(2)}`;
    document.getElementById('totalReferrals').textContent = totalReferrals;
    document.getElementById('pendingBonus').textContent = `GHS ${pendingBonus.toFixed(2)}`;
}

    updateRecentTransactions() {
        const transactionsContainer = document.getElementById('recentTransactions');
        const tableBody = document.getElementById('transactionsTableBody');
        
        if (!this.currentUser.transactions || this.currentUser.transactions.length === 0) {
            transactionsContainer.innerHTML = '<p>No recent transactions</p>';
            tableBody.innerHTML = '<tr><td colspan="5">No transactions found</td></tr>';
            return;
        }

        // Sort transactions by date (newest first)
        const sortedTransactions = [...this.currentUser.transactions].sort((a, b) => 
            new Date(b.date) - new Date(a.date)
        );

        // Update recent transactions (last 5)
        const recentHtml = sortedTransactions.slice(0, 5).map(transaction => `
            <div class="transaction-item">
                <div class="transaction-info">
                    <div class="transaction-type">${this.formatTransactionType(transaction.type)}</div>
                    <div class="transaction-date">${new Date(transaction.date).toLocaleDateString()}</div>
                </div>
                <div class="transaction-amount ${transaction.amount >= 0 ? 'positive' : 'negative'}">
                    ${transaction.amount >= 0 ? '+' : ''}GHS ${Math.abs(transaction.amount).toFixed(2)}
                </div>
            </div>
        `).join('');

        transactionsContainer.innerHTML = recentHtml;

        // Update full transactions table
        const tableHtml = sortedTransactions.map(transaction => `
            <tr>
                <td>${new Date(transaction.date).toLocaleDateString()}</td>
                <td>${this.formatTransactionType(transaction.type)}</td>
                <td class="${transaction.amount >= 0 ? 'positive' : 'negative'}">
                    ${transaction.amount >= 0 ? '+' : ''}GHS ${Math.abs(transaction.amount).toFixed(2)}
                </td>
                <td><span class="status-${transaction.status}">${transaction.status}</span></td>
                <td>${transaction.description || ''}</td>
            </tr>
        `).join('');

        tableBody.innerHTML = tableHtml;
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

   updateReferralLink() {
    const referralLink = `https://moneypilot.site/register?ref=${this.currentUser.referralCode}`;
    document.getElementById('referralLink').value = referralLink;
}

    openInvestmentModal(button) {
    // Refresh user data first
    this.currentUser = this.auth.getCurrentUser();
    const users = JSON.parse(localStorage.getItem('moneyPilotUsers')) || [];
    const freshUser = users.find(u => u.id === this.currentUser.id);
    if (freshUser) this.currentUser = freshUser;

    const plan = button.dataset.plan;
    const amount = parseFloat(button.dataset.amount);

    if (this.currentUser.balance < amount) {
        alert('Insufficient balance. Please deposit funds first.');
        return;
    }

    this.selectedPlan = { plan, amount };
    
    const modal = document.getElementById('investmentModal');
    const details = document.getElementById('investmentDetails');
    
    details.innerHTML = `
        <p><strong>Plan:</strong> ${plan.charAt(0).toUpperCase() + plan.slice(1)}</p>
        <p><strong>Investment Amount:</strong> GHS ${amount.toFixed(2)}</p>
        <p><strong>Expected Return:</strong> GHS ${this.calculateExpectedReturn(plan, amount).toFixed(2)}</p>
        <p><strong>Maturity Period:</strong> ${this.getMaturityPeriod(plan)}</p>
    `;
    
    modal.style.display = 'block';
}

    calculateExpectedReturn(plan, amount) {
        const returns = {
            'bronze': 2325.23,
            'silver': 4185.41,
            'gold': 7905.78,
            'platinum': 13951.38
        };
        return returns[plan] || amount;
    }

    getMaturityPeriod(plan) {
        const periods = {
            'bronze': '3 Weeks',
            'silver': '3 Weeks',
            'gold': '5 Weeks',
            'platinum': '6 Weeks'
        };
        return periods[plan] || 'N/A';
    }

    closeModal() {
        document.getElementById('investmentModal').style.display = 'none';
        this.selectedPlan = null;
    }

    processInvestment() {
        if (!this.selectedPlan) return;

        const { plan, amount } = this.selectedPlan;

        // Check balance
        if (this.currentUser.balance < amount) {
            alert('Insufficient balance!');
            this.closeModal();
            return;
        }

        // Create investment record
        const investment = {
            id: this.generateId(),
            plan: plan,
            amount: amount,
            expectedReturn: this.calculateExpectedReturn(plan, amount),
            startDate: new Date().toISOString(),
            maturityDate: this.calculateMaturityDate(plan),
            status: 'active'
        };

        // Create transaction record
        const transaction = {
            id: this.generateId(),
            type: 'investment',
            amount: -amount,
            description: `Investment in ${plan} plan`,
            date: new Date().toISOString(),
            status: 'completed'
        };

        // Update user data
        this.currentUser.balance -= amount;
        if (!this.currentUser.investments) this.currentUser.investments = [];
        this.currentUser.investments.push(investment);
        this.currentUser.transactions.push(transaction);
        this.currentUser.plan = plan;

        // Save changes
        this.auth.updateUser(this.currentUser.id, {
            balance: this.currentUser.balance,
            investments: this.currentUser.investments,
            transactions: this.currentUser.transactions,
            plan: plan
        });

        alert(`Successfully invested GHS ${amount.toFixed(2)} in ${plan} plan!`);
        this.closeModal();
        this.updateDashboard();
    }

    calculateMaturityDate(plan) {
        const days = {
            'bronze': 21,
            'silver': 21,
            'gold': 35,
            'platinum': 42
        };
        
        const date = new Date();
        date.setDate(date.getDate() + (days[plan] || 0));
        return date.toISOString();
    }

    copyReferralLink() {
        const linkInput = document.getElementById('referralLink');
        linkInput.select();
        linkInput.setSelectionRange(0, 99999);
        document.execCommand('copy');
        alert('Referral link copied to clipboard!');
    }

    shareReferralLink(platform) {
        const link = document.getElementById('referralLink').value;
        const message = `Join MoneyPilot and start earning with crypto investments! Use my referral link: ${link}`;
        
        let shareUrl;
        switch (platform) {
            case 'whatsapp':
                shareUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
                break;
            case 'telegram':
                shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(message)}`;
                break;
            case 'facebook':
                shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`;
                break;
            default:
                return;
        }
        
        window.open(shareUrl, '_blank', 'width=600,height=400');
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    new Dashboard();
});