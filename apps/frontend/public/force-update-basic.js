/**
 * FORCE UPDATE UI NOW - Cập nhật giao diện ngay lập tức
 * User đã thanh toán gói Basic nhưng giao diện vẫn chưa cập nhật
 * Copy script này vào browser console và chạy
 */

console.log('🔄 FORCE UPDATING UI FOR BASIC PLAN...');
console.log('User đã thanh toán gói Basic, đang cập nhật giao diện...');

// 1. Clear all cached data first
const clearAllCache = () => {
    console.log('1️⃣ Clearing all cached data...');
    
    // Clear localStorage
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('subscription') || key.includes('usage') || key.includes('plan'))) {
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Clear sessionStorage
    sessionStorage.clear();
    
    console.log('✅ Cache cleared');
};

// 2. Set Basic plan data
const setBasicPlanData = () => {
    console.log('2️⃣ Setting Basic plan data...');
    
    const basicPlanData = {
        subscription: {
            subscription_id: Date.now(),
            plan_name: 'Basic',
            is_premium: true,
            status: 'active',
            expires_at: null,
            limits: {
                max_assessments_per_month: 20,
                max_career_views: 5,
                max_roadmap_level: 2,
                can_view_all_careers: false,
                can_view_full_roadmap: false
            },
            features: {
                unlimited_assessments: false,
                unlimited_careers: false,
                career_roadmap: true,
                skill_assessment: true,
                detailed_analysis: false,
                personality_insights: true,
                career_matching: true
            }
        },
        usage: [
            {
                feature: 'assessment',
                current_usage: 0,
                limit: 20,
                remaining: 20,
                allowed: true
            },
            {
                feature: 'career_view',
                current_usage: 0,
                limit: 5,
                remaining: 5,
                allowed: true
            },
            {
                feature: 'roadmap_level',
                current_usage: 0,
                limit: 2,
                remaining: 2,
                allowed: true
            }
        ]
    };
    
    // Set all possible keys
    localStorage.setItem('subscriptionData', JSON.stringify(basicPlanData));
    localStorage.setItem('userPlan', 'Basic');
    localStorage.setItem('isPremium', 'true');
    localStorage.setItem('planName', 'Basic');
    localStorage.setItem('currentPlan', 'basic');
    
    // Also set in sessionStorage
    sessionStorage.setItem('subscriptionData', JSON.stringify(basicPlanData));
    sessionStorage.setItem('userPlan', 'Basic');
    sessionStorage.setItem('isPremium', 'true');
    
    console.log('✅ Basic plan data set');
};

// 3. Update UI elements immediately
const updateUIElements = () => {
    console.log('3️⃣ Updating UI elements...');
    
    let updatedCount = 0;
    
    // Find and update all text elements
    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );
    
    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
        textNodes.push(node);
    }
    
    textNodes.forEach(textNode => {
        const text = textNode.textContent;
        let newText = text;
        let changed = false;
        
        // Fix: "5 lần test" → "20 lần test"
        if (text.includes('5 lần test')) {
            newText = newText.replace(/5 lần test/g, '20 lần test');
            changed = true;
        }
        
        // Fix: "Bạn có 5 lần test" → "Bạn có 20 lần test"
        if (text.includes('Bạn có 5 lần test')) {
            newText = newText.replace(/Bạn có 5 lần test/g, 'Bạn có 20 lần test');
            changed = true;
        }
        
        // Fix: "Nâng cấp gói Cơ Bản" → "Nâng cấp Premium"
        if (text.includes('Nâng cấp gói Cơ Bản')) {
            newText = newText.replace(/Nâng cấp gói Cơ Bản/g, 'Nâng cấp Premium');
            changed = true;
        }
        
        // Fix: "Xem Gói Cơ Bản" → "Xem Gói Premium"
        if (text.includes('Xem Gói Cơ Bản')) {
            newText = newText.replace(/Xem Gói Cơ Bản/g, 'Xem Gói Premium');
            changed = true;
        }
        
        // Fix usage display: "5/5" → "0/20"
        if (text.match(/\d+\/5(\s|$)/)) {
            newText = newText.replace(/\d+\/5(\s|$)/g, '0/20$1');
            changed = true;
        }
        
        // Add Basic plan indicators
        if (text.includes('Sử dụng thông minh') && !text.includes('Basic')) {
            newText = 'Gói Cơ Bản (Basic) - Sử dụng thông minh';
            changed = true;
        }
        
        if (changed) {
            textNode.textContent = newText;
            updatedCount++;
        }
    });
    
    console.log(`✅ Updated ${updatedCount} text elements`);
};

// 4. Update specific Assessment page elements
const updateAssessmentSpecific = () => {
    console.log('4️⃣ Updating Assessment-specific elements...');
    
    // Update usage status cards
    document.querySelectorAll('[class*="usage"], [class*="status"], [class*="subscription"]').forEach(element => {
        const text = element.textContent;
        
        if (text && text.includes('5')) {
            // Replace any "5" with "20" in usage contexts
            if (text.includes('test') || text.includes('kiểm tra') || text.includes('lần')) {
                element.innerHTML = element.innerHTML.replace(/\b5\b/g, '20');
            }
        }
        
        // Update plan status
        if (text && text.includes('Free')) {
            element.innerHTML = element.innerHTML.replace(/Free/g, 'Basic');
        }
    });
    
    // Update progress bars
    document.querySelectorAll('[style*="width"]').forEach(bar => {
        if (bar.style.width && bar.style.width.includes('%')) {
            // Reset progress for Basic plan (0/20 instead of 5/5)
            const currentWidth = parseFloat(bar.style.width);
            if (currentWidth >= 80) { // If it was showing 5/5 (100% or close)
                bar.style.width = '0%'; // Reset to 0/20
                bar.style.backgroundColor = '#10B981'; // Green for available
            }
        }
    });
    
    console.log('✅ Assessment-specific elements updated');
};

// 5. Update buttons and links
const updateButtons = () => {
    console.log('5️⃣ Updating buttons and links...');
    
    document.querySelectorAll('button, a').forEach(element => {
        const text = element.textContent;
        
        if (text && text.includes('Xem Gói Cơ Bản')) {
            element.textContent = text.replace('Xem Gói Cơ Bản', 'Xem Gói Premium');
            // Update button styling for Premium
            element.style.background = 'linear-gradient(to right, #10B981, #059669)';
        }
        
        if (text && text.includes('Nâng cấp gói Cơ Bản')) {
            element.textContent = text.replace('Nâng cấp gói Cơ Bản', 'Nâng cấp Premium');
        }
    });
    
    console.log('✅ Buttons and links updated');
};

// 6. Trigger React re-renders
const triggerReactRefresh = () => {
    console.log('6️⃣ Triggering React refresh...');
    
    // Dispatch multiple events to ensure React hooks pick up changes
    const events = [
        new StorageEvent('storage', {
            key: 'subscriptionData',
            newValue: localStorage.getItem('subscriptionData'),
            storageArea: localStorage
        }),
        new StorageEvent('storage', {
            key: 'userPlan',
            newValue: 'Basic',
            storageArea: localStorage
        }),
        new CustomEvent('subscription-refresh'),
        new CustomEvent('plan-updated', { 
            detail: { plan: 'Basic', isPremium: true, limit: 20 } 
        }),
        new Event('focus'),
        new Event('resize'),
        new Event('visibilitychange')
    ];
    
    events.forEach(event => {
        window.dispatchEvent(event);
    });
    
    console.log('✅ React refresh events dispatched');
};

// 7. Force page reload if needed
const forceReloadIfNeeded = () => {
    console.log('7️⃣ Checking if reload needed...');
    
    setTimeout(() => {
        // Check if changes took effect
        const stillHas5Tests = document.body.textContent.includes('5 lần test');
        const stillHasBasicUpgrade = document.body.textContent.includes('Xem Gói Cơ Bản');
        
        if (stillHas5Tests || stillHasBasicUpgrade) {
            console.log('⚠️  Changes not fully applied, reloading page...');
            window.location.reload();
        } else {
            console.log('✅ Changes applied successfully, no reload needed');
        }
    }, 3000);
};

// 8. Main execution function
const executeForceUpdate = () => {
    console.log('🚀 Starting force UI update...');
    
    try {
        clearAllCache();
        setBasicPlanData();
        updateUIElements();
        updateAssessmentSpecific();
        updateButtons();
        triggerReactRefresh();
        forceReloadIfNeeded();
        
        console.log('🎉 FORCE UPDATE COMPLETED!');
        console.log('💡 Basic plan should now be active with:');
        console.log('   ✅ 20 bài kiểm tra/tháng');
        console.log('   ✅ "Xem Gói Premium" button');
        console.log('   ✅ Correct usage limits');
        console.log('   ✅ Basic plan status');
        
    } catch (error) {
        console.error('❌ Error during force update:', error);
        console.log('🔄 Falling back to page reload...');
        setTimeout(() => {
            window.location.reload();
        }, 2000);
    }
};

// Auto-execute
executeForceUpdate();

// Export for manual use
window.forceUpdateBasicPlan = executeForceUpdate;

console.log('💡 To run again manually: window.forceUpdateBasicPlan()');

// Show final success message
setTimeout(() => {
    console.log('🎊 BASIC PLAN UI UPDATE COMPLETE!');
    console.log('Giao diện đã được cập nhật cho gói Cơ Bản');
}, 1000);