/**
 * Universal AI Employee System Demo Page
 * 
 * Demonstrates the complete universal AI employee system
 * with all 30 employees, cloud storage, and database integration
 */

import React, { useState } from 'react';
import UniversalAIEmployeeChat from '../components/ai/UniversalAIEmployeeChat';
import CloudFileUploader from '../components/upload/CloudFileUploader';
import { universalAIEmployeeManager } from '../lib/universalAIEmployeeConnection';

export const UniversalAIEmployeeSystemDemo: React.FC = () => {
  const [selectedEmployee, setSelectedEmployee] = useState('prime');
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [systemStats, setSystemStats] = useState<any>(null);

  const handleEmployeeChange = (employeeId: string) => {
    setSelectedEmployee(employeeId);
  };

  const handleUploadComplete = (result: { url: string; key: string; filename: string }) => {
    setUploadResult(result);
    
    // Notify AI employee about the upload
    const employee = universalAIEmployeeManager.getEmployee(selectedEmployee);
    if (employee) {
      employee.chat(`I just uploaded a file: ${result.filename}. Can you help me process it?`, {
        user_id: 'demo-user',
        uploaded_file: result
      });
    }
  };

  const handleUploadError = (error: string) => {
    console.error('Upload error:', error);
  };

  const getSystemStats = () => {
    const employees = universalAIEmployeeManager.getAllEmployees();
    const activeEmployee = universalAIEmployeeManager.getActiveEmployee();
    
    return {
      total_employees: employees.length,
      active_employee: activeEmployee,
      employees_by_specialty: {
        'Document Processing': employees.filter(emp => 
          emp.expertise.some((exp: string) => exp.includes('document') || exp.includes('categorization'))
        ).length,
        'Financial Analysis': employees.filter(emp => 
          emp.expertise.some((exp: string) => exp.includes('analysis') || exp.includes('forecasting'))
        ).length,
        'Debt & Budgeting': employees.filter(emp => 
          emp.expertise.some((exp: string) => exp.includes('debt') || exp.includes('budget'))
        ).length,
        'Motivation & Goals': employees.filter(emp => 
          emp.expertise.some((exp: string) => exp.includes('motivation') || exp.includes('goal'))
        ).length,
        'Wellness & Support': employees.filter(emp => 
          emp.expertise.some((exp: string) => exp.includes('wellness') || exp.includes('support'))
        ).length,
      }
    };
  };

  React.useEffect(() => {
    setSystemStats(getSystemStats());
  }, [selectedEmployee]);

  const currentEmployee = universalAIEmployeeManager.getEmployee(selectedEmployee);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Universal AI Employee System
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Experience the power of 30 specialized AI employees, each with unique personalities and expertise, 
            all connected through a single intelligent system with cloud storage and database integration.
          </p>
        </div>

        {/* System Stats */}
        {systemStats && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">System Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{systemStats.total_employees}</div>
                <div className="text-sm text-gray-600">Total AI Employees</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {systemStats.employees_by_specialty['Document Processing']}
                </div>
                <div className="text-sm text-gray-600">Document Specialists</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {systemStats.employees_by_specialty['Financial Analysis']}
                </div>
                <div className="text-sm text-gray-600">Analysis Experts</div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* AI Employee Chat */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                AI Employee Chat
              </h2>
              <p className="text-gray-600">
                Chat with any of our 30 AI employees. Each has a unique personality and specialty.
              </p>
            </div>
            <div className="h-96">
              <UniversalAIEmployeeChat
                initialEmployeeId={selectedEmployee}
                onEmployeeChange={handleEmployeeChange}
                className="h-full"
              />
            </div>
          </div>

          {/* File Upload */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                Cloud File Upload
              </h2>
              <p className="text-gray-600">
                Upload documents to cloud storage and let AI employees process them.
              </p>
            </div>
            <div className="p-6">
              <CloudFileUploader
                onUploadComplete={handleUploadComplete}
                onUploadError={handleUploadError}
                className="mb-4"
              />
              
              {uploadResult && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h3 className="font-medium text-green-800 mb-2">Upload Successful!</h3>
                  <div className="text-sm text-green-700">
                    <p><strong>File:</strong> {uploadResult.filename}</p>
                    <p><strong>URL:</strong> {uploadResult.url}</p>
                    <p><strong>Key:</strong> {uploadResult.key}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Employee Showcase */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Meet Our AI Employees</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {universalAIEmployeeManager.getAllEmployees().map((employee) => (
              <div
                key={employee.id}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  employee.id === selectedEmployee
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => setSelectedEmployee(employee.id)}
              >
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
                    {employee.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{employee.name}</h3>
                    <p className="text-sm text-gray-600">{employee.specialty}</p>
                  </div>
                </div>
                
                <p className="text-sm text-gray-700 mb-3">{employee.personality}</p>
                
                <div className="flex flex-wrap gap-1">
                  {employee.expertise.slice(0, 2).map((skill: string, index: number) => (
                    <span
                      key={index}
                      className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                    >
                      {skill}
                    </span>
                  ))}
                  {employee.expertise.length > 2 && (
                    <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                      +{employee.expertise.length - 2} more
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Features Overview */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">System Features</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="font-medium text-gray-900 mb-2">Universal Intelligence</h3>
              <p className="text-sm text-gray-600">
                All 30 employees operate at 85-90/100 intelligence level with universal capabilities
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-medium text-gray-900 mb-2">Cloud Storage</h3>
              <p className="text-sm text-gray-600">
                Integrated with AWS S3 and Cloudflare R2 for secure file storage and processing
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
              </div>
              <h3 className="font-medium text-gray-900 mb-2">Database Integration</h3>
              <p className="text-sm text-gray-600">
                Full production database with users, transactions, categories, and AI interactions
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-medium text-gray-900 mb-2">Smart Routing</h3>
              <p className="text-sm text-gray-600">
                Automatic routing to the best AI employee based on request type and context
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="font-medium text-gray-900 mb-2">Learning System</h3>
              <p className="text-sm text-gray-600">
                AI employees learn from user feedback and improve their responses over time
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="font-medium text-gray-900 mb-2">Collaboration</h3>
              <p className="text-sm text-gray-600">
                AI employees can collaborate and hand off tasks to each other seamlessly
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UniversalAIEmployeeSystemDemo;
