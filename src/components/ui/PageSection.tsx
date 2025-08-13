import React from 'react';

interface PageSectionProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
}

export const PageSection: React.FC<PageSectionProps> = ({ 
  children, 
  title, 
  subtitle,
  className = ''
}) => {
  return (
    <section className={`dashboard-section ${className}`}>
      {title && (
        <div className="mb-4">
          <h3 className="section-title">{title}</h3>
          {subtitle && <p className="text-secondary">{subtitle}</p>}
        </div>
      )}
      <div className="section-content">
        {children}
      </div>
    </section>
  );
};

export default PageSection; 