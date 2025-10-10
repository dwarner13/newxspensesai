/**
 * Guardrails Settings Component
 * =============================
 * User interface for configuring guardrail settings
 * Provides both automatic (always-on) and user-configurable options
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  AlertTriangle, 
  Eye, 
  EyeOff, 
  Lock, 
  Settings,
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface GuardrailConfig {
  userId: string;
  piiDetection: boolean;
  moderation: boolean;
  jailbreakProtection: boolean;
  hallucinationCheck: boolean;
  piiEntities: string[];
}

interface GuardrailsSettingsProps {
  userId: string;
  onConfigChange?: (config: GuardrailConfig) => void;
}

const PII_OPTIONS = [
  { id: 'credit_card', label: 'Credit Card Numbers', description: 'Detect and mask credit card numbers' },
  { id: 'ssn', label: 'Social Security Numbers', description: 'Detect and mask SSNs' },
  { id: 'email', label: 'Email Addresses', description: 'Detect and mask email addresses' },
  { id: 'phone', label: 'Phone Numbers', description: 'Detect and mask phone numbers' },
  { id: 'bank_account', label: 'Bank Account Numbers', description: 'Detect and mask bank account numbers' },
  { id: 'routing_number', label: 'Routing Numbers', description: 'Detect and mask routing numbers' },
  { id: 'sin', label: 'SIN Numbers', description: 'Detect and mask Canadian SINs' },
  { id: 'ein', label: 'EIN Numbers', description: 'Detect and mask Employer ID Numbers' },
];

export function GuardrailsSettings({ userId, onConfigChange }: GuardrailsSettingsProps) {
  const [config, setConfig] = useState<GuardrailConfig>({
    userId,
    piiDetection: true,        // Always on
    moderation: false,
    jailbreakProtection: true, // Always on
    hallucinationCheck: false,
    piiEntities: ['credit_card', 'ssn', 'email', 'phone'],
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load user's current configuration
  useEffect(() => {
    loadGuardrailConfig();
  }, [userId]);

  const loadGuardrailConfig = async () => {
    try {
      const response = await fetch('/.netlify/functions/get-guardrail-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        const data = await response.json();
        setConfig(data);
      }
    } catch (error) {
      console.error('Failed to load guardrail config:', error);
      toast.error('Failed to load security settings');
    } finally {
      setLoading(false);
    }
  };

  const saveGuardrailConfig = async () => {
    setSaving(true);
    try {
      const response = await fetch('/.netlify/functions/save-guardrail-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, config }),
      });

      if (response.ok) {
        toast.success('Security settings saved successfully');
        onConfigChange?.(config);
      } else {
        throw new Error('Failed to save configuration');
      }
    } catch (error) {
      console.error('Failed to save guardrail config:', error);
      toast.error('Failed to save security settings');
    } finally {
      setSaving(false);
    }
  };

  const handlePIIEntityChange = (entityId: string, checked: boolean) => {
    if (checked) {
      setConfig({
        ...config,
        piiEntities: [...config.piiEntities, entityId],
      });
    } else {
      setConfig({
        ...config,
        piiEntities: config.piiEntities.filter(id => id !== entityId),
      });
    }
  };

  if (loading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Security & Privacy Settings
          </CardTitle>
          <CardDescription>Loading your security configuration...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Security & Privacy Settings
          </CardTitle>
          <CardDescription>
            Configure how your financial data is protected and monitored
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Always Active Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700">
            <Lock className="w-5 h-5" />
            Always Active (Required)
          </CardTitle>
          <CardDescription>
            These security measures are always enabled to protect your data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* PII Detection */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-green-50">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-green-600" />
                <h4 className="font-medium text-green-800">PII Detection</h4>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Always On
                </Badge>
              </div>
              <p className="text-sm text-green-700 mt-1">
                Automatically detect and protect personal information (GDPR/CCPA compliance)
              </p>
            </div>
            <Switch checked={true} disabled className="opacity-50" />
          </div>

          {/* Jailbreak Protection */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-green-50">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-600" />
                <h4 className="font-medium text-green-800">Jailbreak Protection</h4>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Always On
                </Badge>
              </div>
              <p className="text-sm text-green-700 mt-1">
                Prevent prompt injection attacks and unauthorized system access
              </p>
            </div>
            <Switch checked={true} disabled className="opacity-50" />
          </div>
        </CardContent>
      </Card>

      {/* User Configurable Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-700">
            <Settings className="w-5 h-5" />
            Optional Settings (You Can Toggle)
          </CardTitle>
          <CardDescription>
            Customize additional security measures based on your preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Content Moderation */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-600" />
                <h4 className="font-medium">Content Moderation</h4>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Filter inappropriate or harmful content before processing
              </p>
            </div>
            <Switch 
              checked={config.moderation}
              onCheckedChange={(checked) => setConfig({...config, moderation: checked})}
            />
          </div>

          {/* Accuracy Checking */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-blue-600" />
                <h4 className="font-medium">Accuracy Checking</h4>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Flag potentially inaccurate financial information for review
              </p>
            </div>
            <Switch 
              checked={config.hallucinationCheck}
              onCheckedChange={(checked) => setConfig({...config, hallucinationCheck: checked})}
            />
          </div>
        </CardContent>
      </Card>

      {/* PII Entity Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-purple-600" />
            PII Detection Types
          </CardTitle>
          <CardDescription>
            Select which types of personal information to detect and protect
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              At least one PII type must be selected for compliance. Credit cards and SSNs are recommended.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {PII_OPTIONS.map((option) => (
              <div key={option.id} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                <Checkbox
                  id={option.id}
                  checked={config.piiEntities.includes(option.id)}
                  onCheckedChange={(checked) => handlePIIEntityChange(option.id, checked as boolean)}
                  disabled={option.id === 'credit_card' || option.id === 'ssn'} // Always required
                />
                <div className="flex-1 min-w-0">
                  <label htmlFor={option.id} className="text-sm font-medium cursor-pointer">
                    {option.label}
                    {(option.id === 'credit_card' || option.id === 'ssn') && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        Required
                      </Badge>
                    )}
                  </label>
                  <p className="text-xs text-gray-500 mt-1">{option.description}</p>
                </div>
              </div>
            ))}
          </div>

          {config.piiEntities.length === 0 && (
            <Alert className="mt-4">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                Please select at least one PII type for compliance requirements.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={saveGuardrailConfig}
          disabled={saving || config.piiEntities.length === 0}
          className="min-w-32"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      {/* Footer Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">How Guardrails Work:</p>
              <ul className="space-y-1 text-xs">
                <li>• <strong>PII Detection:</strong> Automatically masks sensitive information before processing</li>
                <li>• <strong>Jailbreak Protection:</strong> Blocks attempts to override system instructions</li>
                <li>• <strong>Moderation:</strong> Filters harmful or inappropriate content (optional)</li>
                <li>• <strong>Accuracy Check:</strong> Flags potentially inaccurate financial claims (optional)</li>
              </ul>
              <p className="mt-2 text-xs">
                All violations are logged for compliance and security monitoring.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
