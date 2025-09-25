
import { lazy, Suspense } from 'react';

const RetailSceneSVG = lazy(() => Promise.resolve({
  default: () => (
    <svg 
      viewBox="0 0 400 300" 
      className="w-full h-full"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Storefront Background */}
      <rect width="400" height="300" fill="#f8fafc" />
      
      {/* Store Building */}
      <rect x="50" y="80" width="300" height="180" fill="#ffffff" stroke="#e2e8f0" strokeWidth="2" />
      
      {/* Store Sign */}
      <rect x="70" y="50" width="120" height="40" fill="#3F51B5" rx="4" />
      <text x="130" y="75" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">RETAIL STORE</text>
      
      {/* Windows */}
      <rect x="80" y="100" width="80" height="60" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" />
      <rect x="240" y="100" width="80" height="60" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" />
      
      {/* Door */}
      <rect x="180" y="120" width="40" height="80" fill="#64748b" rx="2" />
      <circle cx="210" cy="160" r="2" fill="#fbbf24" />
      
      {/* Product Grid in Left Window */}
      <rect x="90" y="110" width="15" height="15" fill="#3b82f6" rx="1" />
      <rect x="110" y="110" width="15" height="15" fill="#ef4444" rx="1" />
      <rect x="130" y="110" width="15" height="15" fill="#22c55e" rx="1" />
      <rect x="90" y="130" width="15" height="15" fill="#f59e0b" rx="1" />
      <rect x="110" y="130" width="15" height="15" fill="#8b5cf6" rx="1" />
      <rect x="130" y="130" width="15" height="15" fill="#ec4899" rx="1" />
      
      {/* Shopping Cart */}
      <g transform="translate(250, 110)">
        <rect x="0" y="10" width="20" height="12" fill="none" stroke="#64748b" strokeWidth="1.5" />
        <circle cx="5" cy="28" r="3" fill="#64748b" />
        <circle cx="15" cy="28" r="3" fill="#64748b" />
        <path d="M-5 5 L0 5 L2 15" fill="none" stroke="#64748b" strokeWidth="1.5" />
        <rect x="5" y="12" width="8" height="6" fill="#3b82f6" />
      </g>
      
      {/* Sales Tags */}
      <polygon points="300,120 320,120 325,130 320,140 300,140" fill="#ef4444" />
      <text x="310" y="133" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">SALE</text>
      
      {/* Cash Register in Right Window */}
      <rect x="250" y="125" width="25" height="15" fill="#374151" rx="2" />
      <rect x="252" y="127" width="8" height="6" fill="#1f2937" />
      <circle cx="270" cy="132" r="2" fill="#22c55e" />
      
      {/* Ground/Sidewalk */}
      <rect x="0" y="260" width="400" height="40" fill="#e5e7eb" />
      <line x1="0" y1="270" x2="400" y2="270" stroke="#d1d5db" strokeWidth="1" />
      
      {/* People silhouettes */}
      <g transform="translate(320, 220)">
        <circle cx="0" cy="0" r="8" fill="#64748b" />
        <rect x="-6" y="8" width="12" height="20" fill="#64748b" rx="2" />
        <rect x="-4" y="28" width="3" height="12" fill="#64748b" />
        <rect x="1" y="28" width="3" height="12" fill="#64748b" />
      </g>
      
      {/* Decorative elements */}
      <circle cx="380" cy="40" r="15" fill="#fbbf24" opacity="0.3" />
      <circle cx="30" cy="60" r="8" fill="#3b82f6" opacity="0.2" />
    </svg>
  )
}));

export function RetailScene() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg">
      <Suspense fallback={
        <div className="w-full h-full flex items-center justify-center">
          <div className="animate-pulse bg-gray-200 rounded-lg w-3/4 h-3/4"></div>
        </div>
      }>
        <div className="w-full h-full p-8">
          <RetailSceneSVG />
        </div>
      </Suspense>
    </div>
  );
}
