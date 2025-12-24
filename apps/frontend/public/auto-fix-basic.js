
// AUTO INJECTED FIX - Basic Plan
console.log('🔧 AUTO FIXING BASIC PLAN...');

// Force update localStorage with Basic plan data
const basicPlanData = {
    subscription: {
        plan_name: 'Basic',
        is_premium: true,
        status: 'active',
        limits: { max_assessments_per_month: 20 }
    },
    usage: [{
        feature: 'assessment',
        current_usage: 0,
        limit: 20,
        remaining: 20,
        allowed: true
    }]
};

localStorage.setItem('subscriptionData', JSON.stringify(basicPlanData));
localStorage.setItem('userPlan', 'Basic');
localStorage.setItem('isPremium', 'true');

// Update UI immediately
document.querySelectorAll('*').forEach(el => {
    const text = el.textContent;
    if (text) {
        if (text.includes('5 lần test')) {
            el.textContent = text.replace('5 lần test', '20 lần test');
        }
        if (text.includes('Xem Gói Cơ Bản')) {
            el.textContent = text.replace('Xem Gói Cơ Bản', 'Xem Gói Premium');
        }
        if (text.match(/\d+\/5/)) {
            el.textContent = text.replace(/\d+\/5/, '0/20');
        }
    }
});

// Trigger React refresh
window.dispatchEvent(new Event('storage'));
console.log('✅ Basic plan auto-fix applied!');
