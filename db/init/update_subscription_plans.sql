-- Update subscription plans: prices and features
-- Premium: 199,000 VND, Pro: 299,000 VND

-- Update Premium plan price
UPDATE core.subscription_plans 
SET 
    price_monthly = 199000.00,
    price_yearly = 1990000.00,
    features = '{
        "blog_access": true,
        "career_roadmap": true,
        "career_matching": true,
        "priority_support": true,
        "skill_assessment": true,
        "detailed_analysis": true,
        "unlimited_careers": true,
        "personality_insights": true,
        "unlimited_assessments": true,
        "career_recommendations": true,
        "detailed_ksa_analysis": true
    }'::jsonb
WHERE name = 'Premium';

-- Update Pro plan price and features (remove icons, add full career info)
UPDATE core.subscription_plans 
SET 
    price_monthly = 299000.00,
    price_yearly = 2990000.00,
    features = '{
        "pdf_export": true,
        "blog_access": true,
        "career_roadmap": true,
        "career_matching": true,
        "industry_trends": true,
        "salary_insights": true,
        "priority_support": true,
        "skill_assessment": true,
        "career_counseling": true,
        "detailed_analysis": true,
        "progress_tracking": true,
        "unlimited_careers": true,
        "personality_insights": true,
        "unlimited_assessments": true,
        "career_recommendations": true,
        "course_recommendations": true,
        "full_career_info": true,
        "detailed_ksa_analysis": true
    }'::jsonb
WHERE name = 'Pro';

-- Verify updates
SELECT id, name, price_monthly, price_yearly, features 
FROM core.subscription_plans 
WHERE name IN ('Premium', 'Pro', 'Basic', 'Free')
ORDER BY price_monthly;
