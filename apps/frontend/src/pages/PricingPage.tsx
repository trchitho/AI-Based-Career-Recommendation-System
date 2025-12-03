import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';

interface SelectedPlan {
  name: string;
  price: number;
  billingCycle: 'monthly' | 'yearly';
}

const PricingPage = () => {
  // ==========================================
  // 1. LOGIC BLOCK (GIỮ NGUYÊN)
  // ==========================================
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SelectedPlan | null>(null);
  const [paymentStep, setPaymentStep] = useState<'form' | 'processing' | 'success'>('form');

  // Form states
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    billingAddress: '',
    city: '',
    zipCode: '',
  });

  const plans = [
    {
      name: 'Free',
      price: { monthly: 0, yearly: 0 },
      description: 'Perfect for getting started',
      features: [
        'Basic personality assessment',
        '3 career recommendations',
        'Basic roadmap access',
        'Community support',
        'Email support',
      ],
      limitations: [
        'Limited to 1 assessment per month',
        'No detailed reports',
      ],
      color: 'gray',
      popular: false,
    },
    {
      name: 'Professional',
      price: { monthly: 29, yearly: 290 },
      description: 'Best for serious career seekers',
      features: [
        'Unlimited assessments',
        'Detailed personality reports',
        'Top 10 career matches',
        'Full roadmap access',
        'Priority email support',
        'Career progress tracking',
        'Skill development plans',
        'Certificate of completion',
      ],
      limitations: [],
      color: 'green',
      popular: true,
    },
    {
      name: 'Enterprise',
      price: { monthly: 99, yearly: 990 },
      description: 'For teams and organizations',
      features: [
        'Everything in Professional',
        'Team management dashboard',
        'Custom assessments',
        'API access',
        'Dedicated account manager',
        '24/7 priority support',
        'Custom integrations',
        'Advanced analytics',
        'White-label options',
      ],
      limitations: [],
      color: 'blue',
      popular: false,
    },
  ];

  const handleSelectPlan = (planName: string, price: number) => {
    if (planName === 'Free') {
      navigate('/assessment');
      return;
    }

    setSelectedPlan({
      name: planName,
      price: price,
      billingCycle: billingCycle,
    });
    setShowPaymentModal(true);
    setPaymentStep('form');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentStep('processing');

    // Simulate payment processing
    setTimeout(() => {
      setPaymentStep('success');
      setTimeout(() => {
        setShowPaymentModal(false);
        navigate('/dashboard');
      }, 2000);
    }, 2000);
  };

  const closeModal = () => {
    setShowPaymentModal(false);
    setPaymentStep('form');
    setFormData({
      fullName: '',
      email: '',
      phone: '',
      cardNumber: '',
      expiryDate: '',
      cvv: '',
      billingAddress: '',
      city: '',
      zipCode: '',
    });
  };

  // ==========================================
  // 2. NEW DESIGN UI
  // ==========================================
  return (
    <MainLayout>
      <div className="min-h-screen bg-[#F8F9FA] dark:bg-gray-900 font-['Plus_Jakarta_Sans'] text-gray-900 dark:text-white relative overflow-x-hidden pb-20">

        {/* CSS Injection */}
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
          .bg-dot-pattern {
            background-image: radial-gradient(#D1D5DB 1px, transparent 1px);
            background-size: 24px 24px;
          }
          .dark .bg-dot-pattern {
            background-image: radial-gradient(#374151 1px, transparent 1px);
          }
          @keyframes fade-in-up { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
          .animate-fade-in-up { animation: fade-in-up 0.6s ease-out forwards; }
        `}</style>

        {/* Background Layers */}
        <div className="absolute inset-0 bg-dot-pattern pointer-events-none z-0 opacity-40"></div>
        <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-green-500/5 dark:bg-green-500/10 rounded-full blur-[100px] pointer-events-none z-0"></div>
        <div className="fixed bottom-0 left-0 w-[600px] h-[600px] bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-[100px] pointer-events-none z-0"></div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

          {/* --- HEADER & TOGGLE --- */}
          <div className="text-center mb-16 animate-fade-in-up">
            <span className="inline-block py-1.5 px-4 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold tracking-widest uppercase mb-6 border border-green-200 dark:border-green-800">
              Pricing Plans
            </span>
            <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 dark:text-white mb-6 tracking-tight leading-tight">
              Choose Your <span className="text-green-600 dark:text-green-500">Growth Path</span>
            </h1>
            <p className="text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto font-medium leading-relaxed mb-10">
              Unlock your full potential with our comprehensive career guidance platform.
            </p>

            {/* Billing Toggle */}
            <div className="inline-flex items-center bg-white dark:bg-gray-800 p-1.5 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-6 py-2.5 rounded-full font-bold text-sm transition-all ${billingCycle === 'monthly'
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-md'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`px-6 py-2.5 rounded-full font-bold text-sm transition-all flex items-center gap-2 ${billingCycle === 'yearly'
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-md'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                Yearly
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${billingCycle === 'yearly' ? 'bg-green-500 text-white' : 'bg-green-100 text-green-700'}`}>
                  -17%
                </span>
              </button>
            </div>
          </div>

          {/* --- PRICING CARDS --- */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24 animate-fade-in-up">
            {plans.map((plan, index) => (
              <div
                key={index}
                className={`relative bg-white dark:bg-gray-800 rounded-[32px] transition-all duration-300 flex flex-col
                  ${plan.popular
                    ? 'border-2 border-green-500 shadow-2xl shadow-green-500/20 scale-105 z-10'
                    : 'border border-gray-200 dark:border-gray-700 shadow-xl hover:shadow-2xl hover:-translate-y-1'
                  }`}
              >
                {plan.popular && (
                  <div className="absolute -top-5 left-1/2 transform -translate-x-1/2">
                    <span className="bg-green-500 text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-lg uppercase tracking-wider">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="p-8 flex-grow">
                  <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-6 min-h-[40px]">
                    {plan.description}
                  </p>

                  <div className="mb-8">
                    <div className="flex items-baseline">
                      <span className="text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                        ${plan.price[billingCycle]}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400 ml-2 font-medium">
                        /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                      </span>
                    </div>
                    {billingCycle === 'yearly' && plan.price.yearly > 0 && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-2 font-bold">
                        Billed ${(plan.price.yearly).toFixed(0)} yearly
                      </p>
                    )}
                  </div>

                  <div className="space-y-4 mb-8">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">What's included</p>
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start">
                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mt-0.5 mr-3">
                          <svg className="w-3 h-3 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <span className="text-sm text-gray-600 dark:text-gray-300 font-medium leading-tight">
                          {feature}
                        </span>
                      </div>
                    ))}
                    {plan.limitations.map((limit, idx) => (
                      <div key={`limit-${idx}`} className="flex items-start opacity-50">
                        <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center mt-0.5 mr-3">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </div>
                        <span className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-tight">
                          {limit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-8 pt-0 mt-auto">
                  <button
                    onClick={() => handleSelectPlan(plan.name, plan.price[billingCycle])}
                    className={`w-full py-4 rounded-2xl font-bold text-base transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5 ${plan.popular
                        ? 'bg-green-600 text-white hover:bg-green-700 shadow-green-500/20'
                        : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-90'
                      }`}
                  >
                    {plan.name === 'Free' ? 'Get Started Free' : 'Choose Plan'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* --- FAQ SECTION --- */}
          <div className="max-w-3xl mx-auto animate-fade-in-up">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-10">
              Frequently Asked Questions
            </h2>
            <div className="grid gap-4">
              {[
                { q: 'Can I change my plan later?', a: 'Yes, you can upgrade or downgrade your plan at any time. Changes will be reflected in your next billing cycle.' },
                { q: 'Is there a free trial?', a: 'Yes! All paid plans come with a 14-day free trial. No credit card required.' },
                { q: 'What payment methods do you accept?', a: 'We accept all major credit cards, PayPal, and bank transfers for enterprise plans.' },
                { q: 'Can I cancel anytime?', a: 'Absolutely! You can cancel your subscription at any time with no cancellation fees.' },
              ].map((faq, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
                >
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
                    <span className="text-green-500 text-xl">?</span> {faq.q}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 ml-7">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>

          {/* --- CTA SECTION --- */}
          <div className="mt-20 bg-gray-900 dark:bg-gray-800 rounded-[40px] p-12 text-center shadow-2xl relative overflow-hidden animate-fade-in-up">
            <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-[80px]"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px]"></div>

            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Still have questions?
              </h2>
              <p className="text-lg text-gray-400 mb-10 max-w-2xl mx-auto font-medium">
                Our team is here to help you choose the right plan for your career needs.
              </p>
              <button className="px-10 py-4 bg-white text-gray-900 rounded-full font-bold hover:bg-gray-100 transition-all duration-200 shadow-lg hover:scale-105">
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* --- PAYMENT MODAL (Modern Glassmorphism) --- */}
      {showPaymentModal && selectedPlan && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in-up">
          <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-gray-700">

            {paymentStep === 'form' && (
              <>
                {/* Modal Header */}
                <div className="sticky top-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-700 p-6 flex justify-between items-center z-10">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Checkout</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-1">
                      {selectedPlan.name} Plan <span className="mx-1">•</span> <span className="text-green-600 font-bold">${selectedPlan.price}</span>/{selectedPlan.billingCycle}
                    </p>
                  </div>
                  <button onClick={closeModal} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                    <svg className="w-5 h-5 text-gray-500 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>

                {/* Modal Body */}
                <form onSubmit={handlePayment} className="p-8 space-y-8">

                  {/* Personal Info */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs">1</span>
                      Personal Information
                    </h3>
                    <div className="space-y-4 pl-8">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Full Name</label>
                        <input type="text" name="fullName" value={formData.fullName} onChange={handleInputChange} required className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all font-medium" placeholder="John Doe" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Email</label>
                          <input type="email" name="email" value={formData.email} onChange={handleInputChange} required className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all font-medium" placeholder="email@example.com" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Phone</label>
                          <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} required className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all font-medium" placeholder="0123456789" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Info */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs">2</span>
                      Payment Method
                    </h3>
                    <div className="space-y-4 pl-8">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Card Number</label>
                        <div className="relative">
                          <input type="text" name="cardNumber" value={formData.cardNumber} onChange={handleInputChange} required maxLength={19} className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all font-medium" placeholder="0000 0000 0000 0000" />
                          <svg className="w-6 h-6 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Expiry</label>
                          <input type="text" name="expiryDate" value={formData.expiryDate} onChange={handleInputChange} required maxLength={5} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all font-medium" placeholder="MM/YY" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">CVC</label>
                          <input type="text" name="cvv" value={formData.cvv} onChange={handleInputChange} required maxLength={3} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all font-medium" placeholder="123" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Summary & Submit */}
                  <div className="bg-gray-50 dark:bg-gray-700/30 rounded-2xl p-6">
                    <div className="flex justify-between mb-2 text-sm text-gray-600 dark:text-gray-300">
                      <span>Subtotal</span>
                      <span>${selectedPlan.price.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between mb-4 text-sm text-gray-600 dark:text-gray-300">
                      <span>Tax (10%)</span>
                      <span>${(selectedPlan.price * 0.1).toFixed(2)}</span>
                    </div>
                    <div className="border-t border-gray-200 dark:border-gray-600 pt-4 flex justify-between items-center">
                      <span className="font-bold text-gray-900 dark:text-white">Total Due</span>
                      <span className="text-2xl font-extrabold text-green-600">${(selectedPlan.price * 1.1).toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button type="button" onClick={closeModal} className="flex-1 py-4 rounded-xl font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                      Cancel
                    </button>
                    <button type="submit" className="flex-[2] py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg shadow-green-600/30 hover:-translate-y-0.5 transition-all">
                      Confirm Payment
                    </button>
                  </div>
                </form>
              </>
            )}

            {paymentStep === 'processing' && (
              <div className="p-20 text-center flex flex-col items-center">
                <div className="w-20 h-20 border-4 border-gray-100 rounded-full relative mb-6">
                  <div className="absolute inset-0 border-4 border-green-500 rounded-full border-t-transparent animate-spin"></div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Processing Payment</h3>
                <p className="text-gray-500 font-medium">Please wait while we secure your subscription...</p>
              </div>
            )}

            {paymentStep === 'success' && (
              <div className="p-20 text-center flex flex-col items-center">
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6 text-green-600 animate-bounce">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Payment Successful!</h3>
                <p className="text-gray-500 font-medium mb-8">Welcome to {selectedPlan.name}. Redirecting you to dashboard...</p>
              </div>
            )}

          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default PricingPage;