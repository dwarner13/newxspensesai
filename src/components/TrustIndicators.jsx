import React from 'react';

const TrustIndicators = ({ 
    variant = 'default', 
    showAnimation = true,
    className = '' 
}) => {
    const indicators = [
        {
            icon: '🛡️',
            title: 'Unhackable',
            description: "Can't steal data we don't store",
            color: 'from-green-500 to-emerald-600',
            bgColor: 'bg-green-50',
            borderColor: 'border-green-200'
        },
        {
            icon: '⚡',
            title: 'Instant Delete',
            description: 'Data erased within seconds',
            color: 'from-blue-500 to-cyan-600',
            bgColor: 'bg-blue-50',
            borderColor: 'border-blue-200'
        },
        {
            icon: '🤖',
            title: 'Full AI Analysis',
            description: 'Complete insights without storage',
            color: 'from-purple-500 to-pink-600',
            bgColor: 'bg-purple-50',
            borderColor: 'border-purple-200'
        },
        {
            icon: '🔒',
            title: 'Zero Storage',
            description: 'Nothing saved to servers',
            color: 'from-red-500 to-orange-600',
            bgColor: 'bg-red-50',
            borderColor: 'border-red-200'
        },
        {
            icon: '⚖️',
            title: 'GDPR Compliant',
            description: 'Full regulatory compliance',
            color: 'from-indigo-500 to-blue-600',
            bgColor: 'bg-indigo-50',
            borderColor: 'border-indigo-200'
        },
        {
            icon: '🚀',
            title: 'Lightning Fast',
            description: 'Real-time processing',
            color: 'from-yellow-500 to-orange-600',
            bgColor: 'bg-yellow-50',
            borderColor: 'border-yellow-200'
        }
    ];

    const getVariantStyles = () => {
        switch (variant) {
            case 'compact':
                return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';
            case 'horizontal':
                return 'flex flex-wrap gap-4 justify-center';
            case 'featured':
                return 'grid-cols-1 md:grid-cols-2 gap-6';
            default:
                return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
        }
    };

    const getCardStyles = (variant, indicator) => {
        const baseStyles = `trust-indicator-card ${indicator.bgColor} ${indicator.borderColor} border-2 rounded-xl p-4 transition-all duration-300`;
        
        if (variant === 'horizontal') {
            return `${baseStyles} flex-shrink-0 min-w-[200px]`;
        }
        
        return baseStyles;
    };

    return (
        <div className={`trust-indicators ${className}`}>
            <div className={`trust-grid ${getVariantStyles()}`}>
                {indicators.map((indicator, index) => (
                    <div
                        key={index}
                        className={`${getCardStyles(variant, indicator)} ${
                            showAnimation ? 'animate-fade-in-up' : ''
                        }`}
                        style={{
                            animationDelay: showAnimation ? `${index * 0.1}s` : '0s'
                        }}
                    >
                        <div className="trust-indicator-content">
                            <div className={`trust-icon-wrapper bg-gradient-to-r ${indicator.color} rounded-full w-12 h-12 flex items-center justify-center mb-3`}>
                                <span className="trust-icon text-white text-xl">
                                    {indicator.icon}
                                </span>
                            </div>
                            
                            <div className="trust-text">
                                <h3 className="trust-title font-bold text-gray-900 mb-1">
                                    {indicator.title}
                                </h3>
                                <p className="trust-description text-sm text-gray-600 leading-relaxed">
                                    {indicator.description}
                                </p>
                            </div>
                        </div>
                        
                        {/* Hover effect */}
                        <div className={`trust-hover-effect bg-gradient-to-r ${indicator.color} opacity-0 absolute inset-0 rounded-xl transition-opacity duration-300`}></div>
                    </div>
                ))}
            </div>
            
            {/* Trust summary */}
            <div className="trust-summary mt-8 text-center">
                <div className="trust-summary-badge inline-flex items-center gap-2 bg-gradient-to-r from-green-500 to-blue-600 text-white px-6 py-3 rounded-full font-semibold">
                    <span className="trust-summary-icon">✅</span>
                    <span className="trust-summary-text">
                        Trusted by 10,000+ users for privacy-first AI analysis
                    </span>
                </div>
            </div>
        </div>
    );
};

export default TrustIndicators; 