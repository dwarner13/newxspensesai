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
  // Common PII
  { id: 'person_name', label: 'Person Names', description: 'Detect and mask full names', category: 'Common' },
  { id: 'email', label: 'Email Addresses', description: 'Detect and mask email addresses', category: 'Common' },
  { id: 'phone', label: 'Phone Numbers', description: 'Detect and mask phone numbers', category: 'Common' },
  { id: 'location', label: 'Physical Addresses', description: 'Detect and mask street addresses', category: 'Common' },
  { id: 'date_time', label: 'Dates & Times', description: 'Detect and mask dates and timestamps', category: 'Common' },
  { id: 'ip_address', label: 'IP Addresses', description: 'Detect and mask IP addresses', category: 'Common' },
  { id: 'url', label: 'URLs', description: 'Detect and mask web URLs', category: 'Common' },
  { id: 'credit_card', label: 'Credit Card Numbers', description: 'Detect and mask credit card numbers', category: 'Common' },
  { id: 'iban', label: 'IBAN Numbers', description: 'Detect and mask international bank account numbers', category: 'Common' },
  { id: 'crypto_wallet', label: 'Crypto Wallet Addresses', description: 'Detect and mask cryptocurrency addresses', category: 'Common' },
  { id: 'medical_license', label: 'Medical License Numbers', description: 'Detect and mask medical license numbers', category: 'Common' },

  // USA PII
  { id: 'us_bank_account', label: 'US Bank Account Numbers', description: 'Detect and mask US bank account numbers', category: 'USA' },
  { id: 'us_driver_license', label: 'US Driver License Numbers', description: 'Detect and mask US driver license numbers', category: 'USA' },
  { id: 'us_itin', label: 'US ITIN Numbers', description: 'Detect and mask US Individual Taxpayer ID numbers', category: 'USA' },
  { id: 'us_passport', label: 'US Passport Numbers', description: 'Detect and mask US passport numbers', category: 'USA' },
  { id: 'us_ssn', label: 'US Social Security Numbers', description: 'Detect and mask US Social Security numbers', category: 'USA' },
  { id: 'us_routing_number', label: 'US Routing Numbers', description: 'Detect and mask US bank routing numbers', category: 'USA' },
  { id: 'us_ein', label: 'US EIN Numbers', description: 'Detect and mask US Employer ID numbers', category: 'USA' },

  // UK PII
  { id: 'uk_ni_number', label: 'UK National Insurance Numbers', description: 'Detect and mask UK National Insurance numbers', category: 'UK' },
  { id: 'uk_nhs_number', label: 'UK NHS Numbers', description: 'Detect and mask UK NHS numbers', category: 'UK' },

  // Spain PII
  { id: 'spanish_nif', label: 'Spanish NIF Numbers', description: 'Detect and mask Spanish NIF numbers', category: 'Spain' },
  { id: 'spanish_nie', label: 'Spanish NIE Numbers', description: 'Detect and mask Spanish NIE numbers', category: 'Spain' },

  // Italy PII
  { id: 'italian_fiscal_code', label: 'Italian Fiscal Codes', description: 'Detect and mask Italian fiscal codes', category: 'Italy' },
  { id: 'italian_vat', label: 'Italian VAT Codes', description: 'Detect and mask Italian VAT codes', category: 'Italy' },
  { id: 'italian_passport', label: 'Italian Passport Numbers', description: 'Detect and mask Italian passport numbers', category: 'Italy' },
  { id: 'italian_driver_license', label: 'Italian Driver License Numbers', description: 'Detect and mask Italian driver license numbers', category: 'Italy' },
  { id: 'italian_id_card', label: 'Italian ID Card Numbers', description: 'Detect and mask Italian ID card numbers', category: 'Italy' },

  // Poland PII
  { id: 'polish_pesel', label: 'Polish PESEL Numbers', description: 'Detect and mask Polish PESEL numbers', category: 'Poland' },

  // Singapore PII
  { id: 'singapore_nric', label: 'Singapore NRIC/FIN Numbers', description: 'Detect and mask Singapore NRIC/FIN numbers', category: 'Singapore' },
  { id: 'singapore_uen', label: 'Singapore UEN Numbers', description: 'Detect and mask Singapore UEN numbers', category: 'Singapore' },

  // Australia PII
  { id: 'australian_abn', label: 'Australian ABN Numbers', description: 'Detect and mask Australian Business Numbers', category: 'Australia' },
  { id: 'australian_acn', label: 'Australian ACN Numbers', description: 'Detect and mask Australian Company Numbers', category: 'Australia' },
  { id: 'australian_tfn', label: 'Australian TFN Numbers', description: 'Detect and mask Australian Tax File Numbers', category: 'Australia' },
  { id: 'australian_medicare', label: 'Australian Medicare Numbers', description: 'Detect and mask Australian Medicare numbers', category: 'Australia' },

  // India PII
  { id: 'indian_aadhaar', label: 'Indian Aadhaar Numbers', description: 'Detect and mask Indian Aadhaar numbers', category: 'India' },
  { id: 'indian_pan', label: 'Indian PAN Numbers', description: 'Detect and mask Indian PAN numbers', category: 'India' },
  { id: 'indian_passport', label: 'Indian Passport Numbers', description: 'Detect and mask Indian passport numbers', category: 'India' },
  { id: 'indian_voter_id', label: 'Indian Voter ID Numbers', description: 'Detect and mask Indian voter ID numbers', category: 'India' },
  { id: 'indian_vehicle_reg', label: 'Indian Vehicle Registration Numbers', description: 'Detect and mask Indian vehicle registration numbers', category: 'India' },

  // Finland PII
  { id: 'finnish_personal_code', label: 'Finnish Personal Identity Codes', description: 'Detect and mask Finnish personal identity codes', category: 'Finland' },

  // Canada PII
  { id: 'canadian_sin', label: 'Canadian SIN Numbers', description: 'Detect and mask Canadian Social Insurance numbers', category: 'Canada' },
];

export function GuardrailsSettings({ userId, onConfigChange }: GuardrailsSettingsProps) {
  const [config, setConfig] = useState<GuardrailConfig>({
    userId,
    piiDetection: true,        // Always on
    moderation: false,
    jailbreakProtection: true, // Always on
    hallucinationCheck: false,
    piiEntities: ['credit_card', 'us_ssn', 'email', 'phone', 'us_bank_account'],
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

          {/* Group PII options by category */}
          {['Common', 'USA', 'UK', 'Spain', 'Italy', 'Poland', 'Singapore', 'Australia', 'India', 'Finland', 'Canada'].map(category => {
            const categoryOptions = PII_OPTIONS.filter(option => option.category === category);
            if (categoryOptions.length === 0) return null;

            return (
              <div key={category} className="mb-6">
                <h5 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <span className="text-sm bg-gray-100 px-2 py-1 rounded-full">{category}</span>
                  {categoryOptions.length} options
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {categoryOptions.map((option) => (
                    <div key={option.id} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                      <Checkbox
                        id={option.id}
                        checked={config.piiEntities.includes(option.id)}
                        onCheckedChange={(checked) => handlePIIEntityChange(option.id, checked as boolean)}
                        disabled={option.id === 'credit_card' || option.id === 'us_ssn'} // Always required
                      />
                      <div className="flex-1 min-w-0">
                        <label htmlFor={option.id} className="text-sm font-medium cursor-pointer">
                          {option.label}
                          {(option.id === 'credit_card' || option.id === 'us_ssn') && (
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
              </div>
            );
          })}

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
