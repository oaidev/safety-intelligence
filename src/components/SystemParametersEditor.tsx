import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { RotateCcw, Save, Info, AlertCircle, Download } from 'lucide-react';

interface SystemConfig {
  id: string;
  category: string;
  name: string;
  description: string;
  value: any;
  default_value: any;
  value_type: string;
  unit?: string;
  min_value?: number;
  max_value?: number;
}

export function SystemParametersEditor() {
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changes, setChanges] = useState<Record<string, any>>({});
  const { toast } = useToast();

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    const { data, error } = await supabase
      .from('system_configurations')
      .select('*')
      .eq('is_visible', true)
      .order('category', { ascending: true });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load configurations",
        variant: "destructive"
      });
      return;
    }

    setConfigs(data || []);
    setLoading(false);
  };

  const handleChange = (id: string, newValue: any) => {
    setChanges(prev => ({ ...prev, [id]: newValue }));
  };

  const handleSave = async () => {
    setSaving(true);
    
    try {
      const updates = Object.entries(changes).map(async ([id, value]) => {
        const { error } = await supabase
          .from('system_configurations')
          .update({ value: JSON.stringify(value) })
          .eq('id', id);

        if (error) throw error;
      });

      await Promise.all(updates);

      toast({
        title: "Success",
        description: `Updated ${updates.length} parameter(s)`,
      });
      
      setChanges({});
      loadConfigs();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save configurations",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = (id: string) => {
    const config = configs.find(c => c.id === id);
    if (config) {
      handleChange(id, config.default_value);
    }
  };

  const handleExportConfig = () => {
    const configExport = configs.map(c => ({
      id: c.id,
      name: c.name,
      value: changes[c.id] ?? c.value,
      default: c.default_value
    }));

    const blob = new Blob([JSON.stringify(configExport, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `system-config-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Exported",
      description: "Configuration exported successfully"
    });
  };

  const renderInput = (config: SystemConfig) => {
    const currentValue = changes[config.id] ?? config.value;

    switch (config.value_type) {
      case 'number':
        if (config.min_value !== null && config.max_value !== null) {
          return (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Slider
                  value={[Number(currentValue)]}
                  onValueChange={([value]) => handleChange(config.id, value)}
                  min={config.min_value}
                  max={config.max_value}
                  step={config.max_value > 10 ? 1 : 0.01}
                  className="flex-1"
                />
                <Badge variant="secondary" className="ml-3 min-w-[80px] justify-center">
                  {currentValue} {config.unit}
                </Badge>
              </div>
            </div>
          );
        } else {
          return (
            <Input
              type="number"
              value={currentValue}
              onChange={(e) => handleChange(config.id, parseFloat(e.target.value))}
            />
          );
        }

      case 'string':
        if (config.id.includes('model')) {
          return (
            <Select
              value={currentValue}
              onValueChange={(value) => handleChange(config.id, value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite (Fast & Cheap)</SelectItem>
                <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash (Balanced)</SelectItem>
                <SelectItem value="gemini-2.5-pro">Gemini 2.5 Pro (Best Quality)</SelectItem>
                <SelectItem value="gemini-2.0-flash">Gemini 2.0 Flash</SelectItem>
              </SelectContent>
            </Select>
          );
        } else {
          return (
            <Input
              value={currentValue}
              onChange={(e) => handleChange(config.id, e.target.value)}
            />
          );
        }

      case 'object':
        return (
          <WeightsEditor
            weights={currentValue}
            onChange={(newWeights) => handleChange(config.id, newWeights)}
          />
        );

      default:
        return <Input value={String(currentValue)} disabled />;
    }
  };

  const groupedConfigs = configs.reduce((acc, config) => {
    if (!acc[config.category]) {
      acc[config.category] = [];
    }
    acc[config.category].push(config);
    return acc;
  }, {} as Record<string, SystemConfig[]>);

  const categoryLabels: Record<string, string> = {
    similarity: 'Similarity Detection',
    ai_model: 'AI Models & RAG',
    scoring: 'Quality Scoring',
    general: 'General Settings'
  };

  if (loading) {
    return <div className="text-center py-8">Loading configurations...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header with Save/Discard */}
      {Object.keys(changes).length > 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>You have {Object.keys(changes).length} unsaved change(s)</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setChanges({})}>
                Discard
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Export Button */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleExportConfig}>
          <Download className="h-4 w-4 mr-2" />
          Export Configuration
        </Button>
      </div>

      {/* Tabs for Categories */}
      <Tabs defaultValue="similarity" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          {Object.keys(categoryLabels).filter(cat => groupedConfigs[cat]).map(category => (
            <TabsTrigger key={category} value={category}>
              {categoryLabels[category]}
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(groupedConfigs).map(([category, categoryConfigs]) => (
          <TabsContent key={category} value={category} className="space-y-4">
            {categoryConfigs.map(config => (
              <Card key={config.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{config.name}</CardTitle>
                      <CardDescription className="text-sm">
                        {config.description}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReset(config.id)}
                      disabled={!changes[config.id]}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {renderInput(config)}
                  
                  {changes[config.id] !== undefined && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Default: {JSON.stringify(config.default_value)}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        ))}
      </Tabs>

      {/* Warning about service restart */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Note:</strong> Some changes may require page refresh to take effect. 
          The thinking process viewer will show the current values being used.
        </AlertDescription>
      </Alert>
    </div>
  );
}

function WeightsEditor({ weights, onChange }: { weights: Record<string, number>, onChange: (newWeights: Record<string, number>) => void }) {
  const total = Object.values(weights).reduce((sum, val) => sum + val, 0);
  const isValid = Math.abs(total - 1.0) < 0.01;

  return (
    <div className="space-y-3">
      {Object.entries(weights).map(([key, value]) => (
        <div key={key} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <Label>{key.replace(/_/g, ' ')}</Label>
            <Badge variant={isValid ? "secondary" : "destructive"}>
              {(value * 100).toFixed(0)}%
            </Badge>
          </div>
          <Slider
            value={[value * 100]}
            onValueChange={([newValue]) => {
              onChange({ ...weights, [key]: newValue / 100 });
            }}
            min={0}
            max={100}
            step={1}
          />
        </div>
      ))}
      
      {!isValid && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Total must equal 100% (currently {(total * 100).toFixed(1)}%)
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
