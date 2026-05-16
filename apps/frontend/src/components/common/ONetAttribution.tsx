import React from 'react';

/**
 * O*NET Attribution Component
 * Required credit for using O*NET Web Services data.
 * Displays the O*NET logo and attribution text per their guidelines.
 */
const ONetAttribution: React.FC = () => {
  return (
    <div className="mt-10 mb-6 mx-auto max-w-3xl px-4">
      <div className="flex flex-col sm:flex-row items-center gap-4 p-5 rounded-2xl bg-white/80 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 shadow-sm">
        {/* O*NET Logo */}
        <a
          href="https://services.onetcenter.org/"
          target="_blank"
          rel="noopener noreferrer"
          title="O*NET Web Services - U.S. Department of Labor"
          className="flex-shrink-0"
        >
          <img
            src="https://www.onetcenter.org/image/link/onet-in-it.svg"
            alt="O*NET in-it"
            width={110}
            height={50}
            className="block"
          />
        </a>

        {/* Attribution Text */}
        <div className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed text-center sm:text-left">
          <p className="mb-1">
            Dữ liệu nghề nghiệp trên trang này được cung cấp bởi{' '}
            <a
              href="https://services.onetcenter.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
            >
              O*NET Web Services
            </a>
            , Bộ Lao động Hoa Kỳ (USDOL/ETA). Chúng tôi xin chân thành cảm ơn.
          </p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">
            O*NET® is a trademark of the U.S. Department of Labor, Employment and Training Administration.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ONetAttribution;
