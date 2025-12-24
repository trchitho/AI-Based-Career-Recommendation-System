import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, ArrowRight, X } from 'lucide-react';
import { useFeatureAccess, FeatureType, PlanType } from '../../hooks/useFeatureAccess';

interface FeatureGateProps {
  feature: FeatureType;
  isOpen: boolean;
  onClose: () => void;
  children?: React.ReactNode;
}

export const FeatureGate: React.FC<FeatureGateProps> = ({ 
  feature, 
  isOpen, 
  onClose,
  children 
}) => {
  const navigate = useNavigate();
  const { 
    hasFeature, 
    getRequiredPlan, 
    getFeatureInfo, 
    getPlanInfo,
    currentPlan,
    canUpgradeTo 
  } = useFeatureAccess();

  // If user has access, render children
  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  // If modal is not open, don't render anything
  if (!isOpen) {
    return null;
  }

  const requiredPlan = getRequiredPlan(feature);
  const featureInfo = getFeatureInfo(feature);
  const requiredPlanInfo = requiredPlan ? getPlanInfo(requiredPlan) : null;

  const handleUpgrade = () => {
    onClose();
    navigate('/pricing');
  };

  const getPlanColor = (plan: PlanType) => {
    const colors = {
      free: 'gray',
      basic: 'blue',
      premium: 'green',
      pro: 'purple'
    };
    return colors[plan];
  };

  const currentPlanInfo = getPlanInfo(currentPlan);
  const planColor = requiredPlan ? getPlanColor(requiredPlan) : 'green';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-96 max-w-[90vw] shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Crown className={`text-${planColor}-600`} size={24} />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Tính năng {requiredPlanInfo?.name}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="text-center mb-6">
          <div className="mb-4 flex justify-center text-4xl">
            {featureInfo.icon}
          </div>
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {featureInfo.name}
          </h4>
          <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
            {featureInfo.description}
          </p>
        </div>

        <div className={`bg-gradient-to-r from-${planColor}-50 to-${planColor}-100 dark:from-${planColor}-900/20 dark:to-${planColor}-800/20 rounded-lg p-4 mb-6`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Gói hiện tại</div>
              <div className={`font-semibold text-${getPlanColor(currentPlan)}-700 dark:text-${getPlanColor(currentPlan)}-300`}>
                {currentPlanInfo.name}
              </div>
            </div>
            <ArrowRight className="text-gray-400" size={20} />
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Cần nâng cấp</div>
              <div className={`font-semibold text-${planColor}-700 dark:text-${planColor}-300`}>
                {requiredPlanInfo?.name}
              </div>
            </div>
          </div>
          
          {requiredPlanInfo && (
            <div className="text-center">
              <div className={`text-2xl font-bold text-${planColor}-700 dark:text-${planColor}-300`}>
                {new Intl.NumberFormat('vi-VN', {
                  style: 'currency',
                  currency: 'VND',
                }).format(requiredPlanInfo.price)}
                <span className="text-sm font-normal">/tháng</span>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Để sau
          </button>
          <button
            onClick={handleUpgrade}
            className={`flex-1 px-4 py-2 bg-gradient-to-r from-${planColor}-600 to-${planColor}-700 text-white rounded-lg hover:from-${planColor}-700 hover:to-${planColor}-800 transition-all duration-200 font-medium`}
          >
            Nâng cấp ngay
          </button>
        </div>
      </div>
    </div>
  );
};