// Global variables
let currentCurrency = 'GHS';
const exchangeRate = 12.5; // GHS to USD rate

// Currency Toggle Functionality
function initCurrencyToggle() {
    const toggle = document.getElementById('currencyToggle');
    if (toggle) {
        toggle.addEventListener('change', function() {
            currentCurrency = this.checked ? 'USD' : 'GHS';
            updateAllPrices();
            localStorage.setItem('preferredCurrency', currentCurrency);
        });
        
        // Load saved preference
        const savedCurrency = localStorage.getItem('preferredCurrency');
        if (savedCurrency) {
            currentCurrency = savedCurrency;
            toggle.checked = savedCurrency === 'USD';
            updateAllPrices();
        }
    }
}

// Update all prices on the page
function updateAllPrices() {
    const elements = document.querySelectorAll('[data-ghs]');
    elements.forEach(element => {
        const ghsAmount = parseFloat(element.getAttribute('data-ghs'));
        let convertedAmount;
        
        if (currentCurrency === 'USD') {
            convertedAmount = ghsAmount / exchangeRate;
            element.textContent = `$${convertedAmount.toFixed(2)}`;
        } else {
            element.textContent = `GHS ${ghsAmount.toFixed(2)}`;
        }
    });
}

// Testimonials Slider
function initTestimonialsSlider() {
    const testimonials = document.querySelectorAll('.testimonial');
    let currentIndex = 0;
    
    if (testimonials.length > 0) {
        setInterval(() => {
            testimonials[currentIndex].classList.remove('active');
            currentIndex = (currentIndex + 1) % testimonials.length;
            testimonials[currentIndex].classList.add('active');
        }, 5000);
    }
}

// Initialize all functionality when DOM loads
document.addEventListener('DOMContentLoaded', function() {
    initCurrencyToggle();
    initTestimonialsSlider();
    
    // Add currency toggle to pages that need it
    if (!document.getElementById('currencyToggle')) {
        addCurrencyToggle();
    }
});

// Add currency toggle dynamically to pages
function addCurrencyToggle() {
    const header = document.querySelector('header .container');
    if (header && !document.querySelector('.currency-toggle-header')) {
        const toggleHtml = `
            <div class="currency-toggle-header" style="display: flex; align-items: center; gap: 10px;">
                <span>GHS</span>
                <label class="toggle-switch">
                    <input type="checkbox" id="currencyToggle">
                    <span class="toggle-slider"></span>
                </label>
                <span>USD</span>
            </div>
        `;
        header.insertAdjacentHTML('beforeend', toggleHtml);
        initCurrencyToggle();
    }
}

// Utility function to format currency
function formatCurrency(amount) {
    if (currentCurrency === 'USD') {
        return `$${(amount / exchangeRate).toFixed(2)}`;
    }
    return `GHS ${amount.toFixed(2)}`;
}

// Utility function to parse currency
function parseCurrency(amountStr) {
    const num = parseFloat(amountStr.replace(/[^\d.-]/g, ''));
    return isNaN(num) ? 0 : num;
}