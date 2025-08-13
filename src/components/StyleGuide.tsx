import React from 'react';
import DashboardLayout from './layout/DashboardLayout';
import DashboardCard from './ui/DashboardCard';
import { Star, Shield, Zap, Award, Brain, Target, BarChart3 } from 'lucide-react';

const StyleGuide = () => {
  return (
    <DashboardLayout 
      title="Dashboard Style Guide" 
      subtitle="Use ONLY these approved styles for all dashboard pages"
    >
      <div className="space-y-8">
        
        {/* Color Palette */}
        <DashboardCard>
          <h3 className="text-xl font-bold mb-4">Approved Colors</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg card-gradient-blue text-white">
              <h4 className="font-semibold">Blue Gradient</h4>
              <p className="text-sm opacity-90">Primary buttons & highlights</p>
            </div>
            <div className="p-4 rounded-lg card-gradient-purple text-white">
              <h4 className="font-semibold">Purple Gradient</h4>
              <p className="text-sm opacity-90">Secondary elements</p>
            </div>
            <div className="p-4 rounded-lg card-gradient-pink text-white">
              <h4 className="font-semibold">Pink Gradient</h4>
              <p className="text-sm opacity-90">Accent elements</p>
            </div>
            <div className="p-4 rounded-lg dashboard-card">
              <h4 className="font-semibold">Dark Card</h4>
              <p className="text-sm text-muted">Standard content cards</p>
            </div>
          </div>
        </DashboardCard>

        {/* Typography */}
        <DashboardCard>
          <h3 className="text-xl font-bold mb-4">Typography</h3>
          <div className="space-y-4">
            <div>
              <h1>Heading 1 - Main Page Title</h1>
              <p className="text-muted">Used for page headers</p>
            </div>
            <div>
              <h2>Heading 2 - Section Titles</h2>
              <p className="text-muted">Used for major sections</p>
            </div>
            <div>
              <h3>Heading 3 - Card Titles</h3>
              <p className="text-muted">Used for card headers</p>
            </div>
            <div>
              <h4>Heading 4 - Subsection Titles</h4>
              <p className="text-muted">Used for subsections</p>
            </div>
            <div>
              <p>Body text - Standard paragraph text with proper line height and spacing.</p>
              <p className="text-muted">Muted text for secondary information</p>
            </div>
          </div>
        </DashboardCard>

        {/* Buttons */}
        <DashboardCard>
          <h3 className="text-xl font-bold mb-4">Buttons</h3>
          <div className="flex flex-wrap gap-4">
            <button className="btn-primary">
              Primary Button
            </button>
            <button className="btn-secondary">
              Secondary Button
            </button>
            <button className="btn-primary" disabled>
              Disabled Button
            </button>
          </div>
        </DashboardCard>

        {/* Grid Layouts */}
        <DashboardCard>
          <h3 className="text-xl font-bold mb-4">Grid Layouts</h3>
          <div className="space-y-4">
            <div>
              <h4 className="mb-2">2-Column Grid</h4>
              <div className="dashboard-grid dashboard-grid-2">
                <div className="dashboard-card p-4">
                  <h5>Card 1</h5>
                  <p className="text-sm text-muted">Grid item content</p>
                </div>
                <div className="dashboard-card p-4">
                  <h5>Card 2</h5>
                  <p className="text-sm text-muted">Grid item content</p>
                </div>
              </div>
            </div>
            <div>
              <h4 className="mb-2">3-Column Grid</h4>
              <div className="dashboard-grid dashboard-grid-3">
                <div className="dashboard-card p-4">
                  <h5>Card 1</h5>
                  <p className="text-sm text-muted">Grid item content</p>
                </div>
                <div className="dashboard-card p-4">
                  <h5>Card 2</h5>
                  <p className="text-sm text-muted">Grid item content</p>
                </div>
                <div className="dashboard-card p-4">
                  <h5>Card 3</h5>
                  <p className="text-sm text-muted">Grid item content</p>
                </div>
              </div>
            </div>
          </div>
        </DashboardCard>

        {/* Status Indicators */}
        <DashboardCard>
          <h3 className="text-xl font-bold mb-4">Status Indicators</h3>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="status-online">Online</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="status-offline">Offline</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span className="status-warning">Warning</span>
            </div>
          </div>
        </DashboardCard>

        {/* Icons */}
        <DashboardCard>
          <h3 className="text-xl font-bold mb-4">Standard Icons</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2">
              <Brain className="w-5 h-5" />
              <span>Brain - AI Features</span>
            </div>
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5" />
              <span>Shield - Security</span>
            </div>
            <div className="flex items-center space-x-2">
              <Zap className="w-5 h-5" />
              <span>Zap - Performance</span>
            </div>
            <div className="flex items-center space-x-2">
              <Award className="w-5 h-5" />
              <span>Award - Achievements</span>
            </div>
            <div className="flex items-center space-x-2">
              <Target className="w-5 h-5" />
              <span>Target - Goals</span>
            </div>
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5" />
              <span>BarChart3 - Analytics</span>
            </div>
            <div className="flex items-center space-x-2">
              <Star className="w-5 h-5" />
              <span>Star - Favorites</span>
            </div>
          </div>
        </DashboardCard>

        {/* Spacing */}
        <DashboardCard>
          <h3 className="text-xl font-bold mb-4">Spacing System</h3>
          <div className="space-y-4">
            <div className="p-1 bg-white/10 rounded">
              <p className="text-sm">p-1 (8px) - Extra Small</p>
            </div>
            <div className="p-2 bg-white/10 rounded">
              <p className="text-sm">p-2 (16px) - Small</p>
            </div>
            <div className="p-3 bg-white/10 rounded">
              <p className="text-sm">p-3 (24px) - Medium</p>
            </div>
            <div className="p-4 bg-white/10 rounded">
              <p className="text-sm">p-4 (32px) - Large</p>
            </div>
            <div className="p-5 bg-white/10 rounded">
              <p className="text-sm">p-5 (48px) - Extra Large</p>
            </div>
          </div>
        </DashboardCard>

        {/* Rules */}
        <DashboardCard gradient="blue">
          <h3 className="text-xl font-bold mb-4">🚨 STRICT RULES TO FOLLOW</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-start space-x-2">
              <span className="text-red-400">❌</span>
              <span>NEVER create page-specific backgrounds - Use dashboard-background only</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-red-400">❌</span>
              <span>NEVER change font families - Use system font stack only</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-red-400">❌</span>
              <span>NEVER modify core colors - Use CSS variables only</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-green-400">✅</span>
              <span>ALWAYS use DashboardLayout component</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-green-400">✅</span>
              <span>ALWAYS use standard spacing - Use CSS variables</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-green-400">✅</span>
              <span>ALWAYS use standard card components</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-green-400">✅</span>
              <span>NEVER inline styles - Use classes only</span>
            </div>
          </div>
        </DashboardCard>

        {/* Verification Checklist */}
        <DashboardCard>
          <h3 className="text-xl font-bold mb-4">✅ Verification Checklist</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center space-x-2">
              <input type="checkbox" className="rounded" />
              <span>Uses DashboardLayout component</span>
            </div>
            <div className="flex items-center space-x-2">
              <input type="checkbox" className="rounded" />
              <span>Imports dashboard-global.css</span>
            </div>
            <div className="flex items-center space-x-2">
              <input type="checkbox" className="rounded" />
              <span>Uses only approved color variables</span>
            </div>
            <div className="flex items-center space-x-2">
              <input type="checkbox" className="rounded" />
              <span>Uses standard card components</span>
            </div>
            <div className="flex items-center space-x-2">
              <input type="checkbox" className="rounded" />
              <span>Maintains consistent spacing</span>
            </div>
            <div className="flex items-center space-x-2">
              <input type="checkbox" className="rounded" />
              <span>No custom backgrounds</span>
            </div>
            <div className="flex items-center space-x-2">
              <input type="checkbox" className="rounded" />
              <span>No custom fonts</span>
            </div>
            <div className="flex items-center space-x-2">
              <input type="checkbox" className="rounded" />
              <span>Follows button styling</span>
            </div>
            <div className="flex items-center space-x-2">
              <input type="checkbox" className="rounded" />
              <span>Maintains header structure</span>
            </div>
          </div>
        </DashboardCard>
      </div>
    </DashboardLayout>
  );
};

export default StyleGuide; 