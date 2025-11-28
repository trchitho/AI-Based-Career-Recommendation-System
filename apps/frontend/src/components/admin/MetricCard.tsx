interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, subtitle, icon, trend }) => {
  return (
    <div
      className="
        rounded-xl shadow p-6 
        bg-gray-50 dark:bg-[#0F172A] 
        border border-gray-200 dark:border-[#1E293B]
      "
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">

          {/* TITLE */}
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {title}
          </p>

          {/* VALUE */}
          <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">
            {value}
          </p>

          {/* SUBTITLE */}
          {subtitle && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {subtitle}
            </p>
          )}

          {/* TREND */}
          {trend && (
            <div className="mt-2 flex items-center">
              <span
                className={`text-sm font-medium ${trend.isPositive
                    ? "text-green-600"
                    : "text-red-500"
                  }`}
              >
                {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
              </span>
              <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                vs last period
              </span>
            </div>
          )}

        </div>

        {/* ICON */}
        {icon && <div className="ml-4 text-gray-400 dark:text-gray-500">{icon}</div>}
      </div>
    </div>
  );
};

export default MetricCard;
