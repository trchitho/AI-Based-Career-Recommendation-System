// Fix Payment API Conflicts
// Thêm script này vào index.html để disable conflicting APIs

(function() {
    'use strict';
    
    console.log('🔧 Fixing payment API conflicts...');
    
    // 1. Disable Web Payment API if causing conflicts
    if (window.PaymentRequest) {
        console.log('⚠️ Disabling PaymentRequest API to prevent conflicts');
        window.PaymentRequest = undefined;
    }
    
    // 2. Override problematic payment methods
    const originalPostMessage = window.postMessage;
    window.postMessage = function(message, ...args) {
        // Block messages with pmcId
        if (typeof message === 'object' && message && message.pmcId) {
            console.log('🚫 Blocked pmcId message:', message.pmcId);
            return;
        }
        return originalPostMessage.apply(this, [message, ...args]);
    };
    
    // 3. Override getSupportedCardNetworks if it exists
    if (window.getSupportedCardNetworks) {
        window.getSupportedCardNetworks = function() {
            console.log('🚫 Blocked getSupportedCardNetworks call');
            return [];
        };
    }
    
    // 4. Block checkOrderPaymentSupport
    if (window.checkOrderPaymentSupport) {
        window.checkOrderPaymentSupport = function() {
            console.log('🚫 Blocked checkOrderPaymentSupport call');
            return false;
        };
    }
    
    // 5. Clean up any existing ZaloPay SDK conflicts
    const scripts = document.querySelectorAll('script[src*="zalopay"], script[src*="zalo"]');
    scripts.forEach(script => {
        if (script.src.includes('common-') || script.src.includes('gateway')) {
            console.log('🗑️ Removing conflicting script:', script.src);
            script.remove();
        }
    });
    
    // 6. Override console errors for pmcId
    const originalConsoleError = console.error;
    console.error = function(...args) {
        const message = args.join(' ');
        if (message.includes('pmcId') || message.includes('getSupportedCardNetworks')) {
            console.log('🔇 Suppressed payment API error:', message);
            return;
        }
        return originalConsoleError.apply(this, args);
    };
    
    console.log('✅ Payment conflict fixes applied');
})();