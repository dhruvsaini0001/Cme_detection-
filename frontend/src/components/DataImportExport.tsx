import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Database, Download, Upload, FileText, Calendar, Globe, CheckCircle, AlertCircle, Clock, AlertTriangle, Trash2, Loader2, Brain, Zap, Target } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api, MLAnalysisResult, UploadResult } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

interface FileInfo {
  name: string;
  size: number;
  type: string;
  lastModified: Date;
  status: 'pending' | 'uploading' | 'analyzing' | 'completed' | 'error';
  progress: number;
  analysisType?: 'standard' | 'ml';
  mlResults?: MLAnalysisResult;
  uploadResults?: UploadResult;
}

const DataImportExport = () => {
  const [importProgress, setImportProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [dataSource, setDataSource] = useState('issdc');
  const [selectedFiles, setSelectedFiles] = useState<FileInfo[]>([]);
  const [syncLoading, setSyncLoading] = useState<{[key: string]: boolean}>({});
  const [lastSyncTimes, setLastSyncTimes] = useState<{[key: string]: string}>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = () => {
    setIsImporting(true);
    setImportProgress(0);
    
    const interval = setInterval(() => {
      setImportProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsImporting(false);
          return 100;
        }
        return prev + 10;
      });
    }, 500);
  };

  const handleSyncAll = async () => {
    try {
      // Set loading state for all connections
      const loadingState = dataConnections.reduce((acc, conn) => {
        acc[conn.id] = true;
        return acc;
      }, {} as {[key: string]: boolean});
      setSyncLoading(loadingState);
      
      const response = await fetch('http://localhost:8000/api/data/sync-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Comprehensive sync failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Update all last sync times
      const currentTime = new Date().toLocaleString();
      const newSyncTimes = dataConnections.reduce((acc, conn) => {
        acc[conn.id] = currentTime;
        return acc;
      }, {} as {[key: string]: string});
      setLastSyncTimes(newSyncTimes);
      
      // Show comprehensive success toast
      toast({
        title: "🚀 Comprehensive Sync Completed",
        description: `Successfully synced ${result.successful_sources}/${result.total_sources} data sources. Total records: ${result.total_records}`,
      });
      
      console.log('Comprehensive sync completed:', result);
      
    } catch (error) {
      console.error('Comprehensive sync failed:', error);
      toast({
        title: "❌ Comprehensive Sync Failed",
        description: `Failed to sync all data sources: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        variant: "destructive",
      });
    } finally {
      // Clear all loading states
      setSyncLoading({});
    }
  };

  const handleSyncNow = async (connectionId: string, connectionName: string) => {
    try {
      setSyncLoading(prev => ({ ...prev, [connectionId]: true }));
      
      // Generate specific sync name based on connection
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '');
      const syncName = `${connectionName.replace(/\s+/g, '_')}_Sync_${timestamp}`;
      
      const response = await fetch('http://localhost:8000/api/data/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: syncName,
          sync_type: 'sync',
          data_source: connectionId,
          settings: {
            dataTypes: dataConnections.find(c => c.id === connectionId)?.dataTypes || [],
            autoSync: true,
            connectionName: connectionName,
            syncTimestamp: new Date().toISOString()
          }
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Sync failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Update last sync time with current timestamp
      const syncTime = new Date().toLocaleString();
      setLastSyncTimes(prev => ({ ...prev, [connectionId]: syncTime }));
      
      // Show success toast
      toast({
        title: "✅ Sync Completed Successfully",
        description: `${connectionName}: Processed ${result.records_processed} records at ${syncTime}`,
      });
      
      console.log(`Sync completed for ${connectionName}:`, result);
      
    } catch (error) {
      console.error('Sync failed:', error);
      toast({
        title: "❌ Sync Failed",
        description: `${connectionName}: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        variant: "destructive",
      });
    } finally {
      setSyncLoading(prev => ({ ...prev, [connectionId]: false }));
    }
  };

  const handleConfigure = async (connectionId: string, connectionName: string) => {
    try {
      setSyncLoading(prev => ({ ...prev, [connectionId]: true }));
      
      // Generate specific configuration name
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '');
      const configName = `${connectionName.replace(/\s+/g, '_')}_Config_${timestamp}`;
      
      const response = await fetch('http://localhost:8000/api/data/configure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: configName,
          sync_type: 'configure',
          data_source: connectionId,
          settings: {
            dataTypes: dataConnections.find(c => c.id === connectionId)?.dataTypes || [],
            autoSync: true,
            syncInterval: '1h',
            connectionName: connectionName,
            configTimestamp: new Date().toISOString()
          }
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Configuration failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      toast({
        title: "⚙️ Configuration Updated",
        description: `${connectionName}: Settings saved at ${new Date().toLocaleString()}`,
      });
      
      console.log(`Configuration updated for ${connectionName}:`, result);
      
    } catch (error) {
      console.error('Configuration failed:', error);
      toast({
        title: "❌ Configuration Failed",
        description: `${connectionName}: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        variant: "destructive",
      });
    } finally {
      setSyncLoading(prev => ({ ...prev, [connectionId]: false }));
    }
  };

  const dataConnections = [
    {
      id: 'issdc',
      name: 'ISSDC (ISRO)',
      description: 'Indian Space Science Data Centre',
      status: 'connected',
      lastSync: '2024-12-28 14:30:00',
      dataTypes: ['SWIS Level-2', 'Particle Flux', 'Solar Wind Parameters'],
      icon: Database,
      purpose: 'Primary data source for Aditya-L1 SWIS particle measurements and solar wind parameters',
      realTimeData: true,
      dataVolume: '~2GB/day',
      updateFrequency: '10-minute cadence'
    },
    {
      id: 'cactus',
      name: 'CACTUS CME Database',
      description: 'Computer Aided CME Tracking',
      status: 'connected',
      lastSync: '2024-12-28 12:15:00',  
      dataTypes: ['CME Events', 'Halo CME Catalog', 'Event Properties'],
      icon: Globe,
      purpose: 'Reference catalog for CME events validation and historical analysis',
      realTimeData: true,
      dataVolume: '~50MB/month',
      updateFrequency: 'Daily updates'
    },
    {
      id: 'nasa_spdf',
      name: 'NASA SPDF',
      description: 'Space Physics Data Facility',
      status: 'connected',
      lastSync: 'Never',
      dataTypes: ['CDF Files', 'Solar Wind Data', 'Magnetic Field'],
      icon: Database,
      purpose: 'Supplementary magnetic field and multi-mission solar wind data for cross-validation',
      realTimeData: true,
      dataVolume: '~1GB/day',
      updateFrequency: '1-minute cadence'
    }
  ];

  const recentImports = [
    {
      id: '001',
      source: 'ISSDC',
      type: 'SWIS Level-2 Data',
      date: '2024-12-28',
      size: '2.4 GB',
      records: '144,000',
      status: 'completed'
    },
    {
      id: '002',
      source: 'CACTUS',
      type: 'CME Event Catalog',
      date: '2024-12-27',
      size: '8.2 MB',
      records: '1,256',
      status: 'completed'
    },
    {
      id: '003',
      source: 'ISSDC',
      type: 'Particle Flux Data',
      date: '2024-12-26',
      size: '1.8 GB',
      records: '96,000',
      status: 'processing'
    }
  ];

  // File upload mutation
  const uploadMutation = useMutation({
    mutationFn: (file: File) => api.uploadSWISData(file),
    onSuccess: (data: UploadResult) => {
      const isSuccess = data.status === 'analyzed';
      toast({
        title: isSuccess ? "🚀 File Analyzed Successfully" : "⚠️ File Upload Issue",
        description: isSuccess 
          ? `${data.filename}: Detected ${data.ml_analysis?.cme_events_detected || 0} CME events`
          : `${data.filename}: ${data.error || 'Processing failed'}`,
        variant: isSuccess ? "default" : "destructive"
      });
      
      // Update file status with results
      setSelectedFiles(prev => prev.map(f => 
        f.name === data.filename 
          ? { 
              ...f, 
              status: isSuccess ? 'completed' as const : 'error' as const, 
              progress: 100,
              uploadResults: data,
              analysisType: 'standard'
            }
          : f
      ));
    },
    onError: (error: any) => {
      toast({
        title: "❌ Upload Failed",
        description: error.message || "Failed to upload file",
        variant: "destructive",
      });
      setSelectedFiles(prev => prev.map(f => 
        f.status === 'uploading' 
          ? { ...f, status: 'error' as const, progress: 0 }
          : f
      ));
    },
  });

  // ML Analysis mutation
  const mlAnalysisMutation = useMutation({
    mutationFn: (file: File) => api.analyzeCDFWithML(file),
    onSuccess: (data: MLAnalysisResult) => {
      toast({
        title: "🧠 ML Analysis Completed",
        description: `${data.file_info.filename}: AI detected ${data.ml_results.events_detected} CME events with ${data.ml_results.model_performance.model_version}`,
      });
      
      // Update file status with ML results
      setSelectedFiles(prev => prev.map(f => 
        f.name === data.file_info.filename 
          ? { 
              ...f, 
              status: 'completed' as const, 
              progress: 100,
              mlResults: data,
              analysisType: 'ml'
            }
          : f
      ));
    },
    onError: (error: any) => {
      toast({
        title: "🤖 ML Analysis Failed",
        description: error.message || "ML analysis encountered an error",
        variant: "destructive",
      });
      setSelectedFiles(prev => prev.map(f => 
        f.status === 'analyzing' 
          ? { ...f, status: 'error' as const, progress: 0 }
          : f
      ));
    },
  });

  // Get ML model info
  const { data: mlModelInfo, error: mlModelError, isLoading: mlModelLoading } = useQuery({
    queryKey: ['ml-model-info'],
    queryFn: async () => {
      try {
        console.log('Fetching ML model info from:', `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/ml/model-info`);
        const result = await api.getMLModelInfo();
        console.log('ML model info received:', result);
        return result;
      } catch (error) {
        console.error('Error fetching ML model info:', error);
        throw error;
      }
    },
    staleTime: 600000, // 10 minutes
    retry: 3,
    retryDelay: 1000,
  });

  // Get data summary
  const { data: dataSummary } = useQuery({
    queryKey: ['data-summary'],
    queryFn: api.getDataSummary,
    refetchInterval: 30000, // 30 seconds
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const newFiles: FileInfo[] = files.map(file => ({
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: new Date(file.lastModified),
      status: 'pending' as const,
      progress: 0,
    }));
    setSelectedFiles(prev => [...prev, ...newFiles]);
  };

  const handleUpload = async (analysisType: 'standard' | 'ml' = 'standard') => {
    const pendingFiles = selectedFiles.filter(f => f.status === 'pending');
    if (pendingFiles.length === 0) return;

    for (const fileInfo of pendingFiles) {
      const file = Array.from(fileInputRef.current?.files || []).find(f => f.name === fileInfo.name);
      if (!file) continue;

      // Update status to uploading or analyzing
      const newStatus: 'uploading' | 'analyzing' = analysisType === 'ml' ? 'analyzing' : 'uploading';
      setSelectedFiles(prev => prev.map(f => 
        f.name === fileInfo.name 
          ? { ...f, status: newStatus, analysisType }
          : f
      ));

      // Simulate progress
      const progressInterval = setInterval(() => {
        setSelectedFiles(prev => prev.map(f => {
          if (f.name === fileInfo.name && (f.status === 'uploading' || f.status === 'analyzing') && f.progress < 90) {
            return { ...f, progress: f.progress + Math.random() * 10 };
          }
          return f;
        }));
      }, 200);

      try {
        if (analysisType === 'ml') {
          await mlAnalysisMutation.mutateAsync(file);
        } else {
          await uploadMutation.mutateAsync(file);
        }
        clearInterval(progressInterval);
      } catch (error) {
        clearInterval(progressInterval);
        // Error handling is done in mutations
      }
    }
  };

  const handleRemoveFile = (fileName: string) => {
    setSelectedFiles(prev => prev.filter(f => f.name !== fileName));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      case 'uploading':
        return <Upload className="h-4 w-4 text-blue-400 animate-pulse" />;
      case 'analyzing':
        return <Brain className="h-4 w-4 text-green-400 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-400" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
      case 'uploading':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      case 'analyzing':
        return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'completed':
        return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'connected':
        return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'error':
        return 'bg-red-500/20 text-red-400 border-red-500/50';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Data Sources Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="space-card glow-effect">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connected Sources</CardTitle>
            <Database className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">
              {dataConnections.filter(d => d.status === 'connected').length}
            </div>
            <p className="text-xs text-muted-foreground">Active connections</p>
          </CardContent>
        </Card>

        <Card className="space-card glow-effect">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Volume</CardTitle>
            <FileText className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cosmic">47.2 GB</div>
            <p className="text-xs text-muted-foreground">Total imported</p>
          </CardContent>
        </Card>

        <Card className="space-card glow-effect">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Sync</CardTitle>
            <Calendar className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-400">2h ago</div>
            <p className="text-xs text-muted-foreground">Auto-sync enabled</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="sources" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-card/50 backdrop-blur-md">
          <TabsTrigger value="sources">Data Sources</TabsTrigger>
          <TabsTrigger value="import">Import Data</TabsTrigger>
          <TabsTrigger value="export">Export & Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="sources" className="space-y-6">
          {/* Comprehensive Sync Controls */}
          <Card className="space-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-cosmic">Data Source Management</CardTitle>
                  <CardDescription>
                    Manage connections and synchronize real-time data from all sources
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  className="border-accent/50 text-accent hover:bg-accent/10"
                  disabled={Object.values(syncLoading).some(loading => loading)}
                  onClick={() => handleSyncAll()}
                >
                  {Object.values(syncLoading).some(loading => loading) ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Syncing All...
                    </>
                  ) : (
                    <>
                      <Database className="h-4 w-4 mr-2" />
                      Sync All Sources
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {dataConnections.map((connection) => {
              const Icon = connection.icon;
              return (
                <Card key={connection.id} className="space-card">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Icon className="h-6 w-6 text-cosmic" />
                        <div>
                          <CardTitle className="text-base">{connection.name}</CardTitle>
                          <CardDescription>{connection.description}</CardDescription>
                        </div>
                      </div>
                      <Badge variant="outline" className={getStatusColor(connection.status)}>
                        {getStatusIcon(connection.status)}
                        <span className="ml-1 capitalize">{connection.status}</span>
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Purpose</Label>
                      <p className="text-sm mt-1">{connection.purpose}</p>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Data Types</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {connection.dataTypes.map((type, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {type}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Data Volume</Label>
                        <p className="text-sm font-mono">{connection.dataVolume}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Update Frequency</Label>
                        <p className="text-sm font-mono">{connection.updateFrequency}</p>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Last Sync</Label>
                      <p className="text-sm font-mono">
                        {lastSyncTimes[connection.id] || connection.lastSync}
                      </p>
                    </div>

                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 border-border/50"
                        disabled={syncLoading[connection.id]}
                        onClick={() => handleConfigure(connection.id, connection.name)}
                      >
                        {syncLoading[connection.id] ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            Configuring...
                          </>
                        ) : (
                          'Configure'
                        )}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 border-border/50"
                        disabled={syncLoading[connection.id]}
                        onClick={() => handleSyncNow(connection.id, connection.name)}
                      >
                        {syncLoading[connection.id] ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            Syncing...
                          </>
                        ) : (
                          'Sync Now'
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="import" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Import Configuration */}
            <Card className="space-card">
              <CardHeader>
                <CardTitle className="text-cosmic">Import SWIS Data</CardTitle>
                <CardDescription>
                  Import Level-2 data from ISSDC or upload local files
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Data Source</Label>
                  <select 
                    value={dataSource}
                    onChange={(e) => setDataSource(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-muted/20 border border-border/50 rounded-md text-sm"
                  >
                    <option value="issdc">ISSDC (ISRO)</option>
                    <option value="cactus">CACTUS CME Database</option>
                    <option value="local">Local Files (CDF)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Start Date</Label>
                    <Input 
                      type="date" 
                      defaultValue="2024-08-01"
                      className="mt-1 bg-muted/20 border-border/50"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">End Date</Label>
                    <Input 
                      type="date" 
                      defaultValue="2024-12-28"
                      className="mt-1 bg-muted/20 border-border/50"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Parameters</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {['Particle Flux', 'Number Density', 'Temperature', 'Velocity'].map((param) => (
                      <label key={param} className="flex items-center space-x-2 text-sm">
                        <input type="checkbox" defaultChecked className="rounded" />
                        <span>{param}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {isImporting && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium">Import Progress</Label>
                      <span className="text-sm text-accent">{importProgress}%</span>
                    </div>
                    <Progress value={importProgress} className="w-full" />
                  </div>
                )}

                <Button 
                  onClick={handleImport} 
                  disabled={isImporting}
                  className="w-full bg-accent text-accent-foreground"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isImporting ? 'Importing...' : 'Start Import'}
                </Button>
              </CardContent>
            </Card>

            {/* Recent Imports */}
            <Card className="space-card">
              <CardHeader>
                <CardTitle className="text-cosmic">Recent Imports</CardTitle>
                <CardDescription>
                  History of data imports and processing status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentImports.map((importItem) => (
                    <div key={importItem.id} className="p-3 bg-muted/20 rounded-lg border border-border/50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(importItem.status)}
                          <span className="font-semibold text-sm">{importItem.source}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{importItem.date}</span>
                      </div>
                      
                      <div className="text-sm text-muted-foreground mb-1">{importItem.type}</div>
                      
                      <div className="flex justify-between text-xs">
                        <span>{importItem.size}</span>
                        <span>{importItem.records} records</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="export" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Export Options */}
            <Card className="space-card">
              <CardHeader>
                <CardTitle className="text-cosmic">Export Data</CardTitle>
                <CardDescription>
                  Export processed data and analysis results
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Export Type</Label>
                  <select className="w-full mt-1 px-3 py-2 bg-muted/20 border border-border/50 rounded-md text-sm">
                    <option>CME Detection Results</option>
                    <option>Threshold Analysis</option>
                    <option>Raw SWIS Data</option>
                    <option>Statistical Summary</option>
                  </select>
                </div>

                <div>
                  <Label className="text-sm font-medium">Format</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {['CSV', 'JSON', 'CDF'].map((format) => (
                      <label key={format} className="flex items-center space-x-2 text-sm">
                        <input type="radio" name="format" defaultChecked={format === 'CSV'} />
                        <span>{format}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Date Range</Label>
                    <Input 
                      type="date" 
                      defaultValue="2024-12-01"
                      className="mt-1 bg-muted/20 border-border/50"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">To</Label>
                    <Input 
                      type="date" 
                      defaultValue="2024-12-28"
                      className="mt-1 bg-muted/20 border-border/50"
                    />
                  </div>
                </div>

                <Button className="w-full bg-accent text-accent-foreground">
                  <Download className="h-4 w-4 mr-2" />
                  Generate Export
                </Button>
              </CardContent>
            </Card>

            {/* Reports */}
            <Card className="space-card">
              <CardHeader>
                <CardTitle className="text-cosmic">Analysis Reports</CardTitle>
                <CardDescription>
                  Generate comprehensive analysis reports
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {[
                    { title: 'Monthly CME Summary', desc: 'December 2024 analysis', size: '2.4 MB' },
                    { title: 'Threshold Validation Report', desc: 'Current configuration analysis', size: '1.8 MB' },
                    { title: 'SWIS Data Quality Report', desc: 'Coverage and accuracy metrics', size: '956 KB' }
                  ].map((report, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                      <div>
                        <div className="font-semibold text-sm">{report.title}</div>
                        <div className="text-xs text-muted-foreground">{report.desc}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">{report.size}</div>
                        <Button variant="outline" size="sm" className="mt-1 border-border/50">
                          <Download className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* File Upload */}
      <Card className="space-card">
        <CardHeader>
          <CardTitle className="text-cosmic">Import SWIS Data</CardTitle>
          <CardDescription>
            Upload SWIS Level-2 CDF files for CME detection analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upload Area */}
          <div className="border-2 border-dashed border-border/50 rounded-lg p-8 text-center hover:border-accent/50 transition-colors">
            <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <div className="space-y-2">
              <p className="text-lg font-medium">Drop SWIS CDF files here</p>
              <p className="text-sm text-muted-foreground">
                or click to browse files
              </p>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="mt-4"
              >
                <Upload className="h-4 w-4 mr-2" />
                Select Files
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".cdf,.CDF"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* File List */}
          {selectedFiles.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Selected Files ({selectedFiles.length})</h4>
                <div className="flex space-x-2">
                  <Button
                    onClick={() => handleUpload('standard')}
                    disabled={uploadMutation.isPending || selectedFiles.every(f => f.status !== 'pending')}
                    className="bg-solar-orange hover:bg-solar-orange/90 text-white"
                  >
                    {uploadMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload All
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => handleUpload('ml')}
                    disabled={mlAnalysisMutation.isPending || selectedFiles.every(f => f.status !== 'pending')}
                    variant="outline"
                    className="border-green-500 text-green-500 hover:bg-green-50"
                  >
                    {mlAnalysisMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-500 mr-2"></div>
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Brain className="h-4 w-4 mr-2" />
                        ML Analysis
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedFiles([])}
                    className="border-border/50"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear All
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card/20">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(file.status)}
                      <div>
                        <p className="font-medium text-sm">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)} • {file.lastModified.toLocaleDateString()}
                        </p>
                        {file.analysisType === 'ml' && (
                          <p className="text-xs text-green-400">
                            🧠 ML Analysis {file.status === 'completed' ? 'Complete' : 'Pending'}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      {file.status === 'uploading' && (
                        <div className="w-24">
                          <Progress value={file.progress} className="h-2" />
                        </div>
                      )}
                      
                      <Badge variant="outline" className={getStatusColor(file.status)}>
                        {file.status.charAt(0).toUpperCase() + file.status.slice(1)}
                      </Badge>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFile(file.name)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* ML Analysis Results */}
              {selectedFiles.some(f => f.mlResults) && (
                <div className="mt-6 space-y-4">
                  <h4 className="font-medium text-green-400">🧠 ML Analysis Results</h4>
                  <div className="space-y-3">
                    {selectedFiles
                      .filter(f => f.mlResults)
                      .map((file, index) => (
                        <div key={index} className="p-4 rounded-lg border border-green-500/20 bg-green-500/5">
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="font-medium text-sm">{file.name}</h5>
                            <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/50">
                              <Target className="h-3 w-3 mr-1" />
                              {(file.mlResults!.prediction.confidence * 100).toFixed(1)}% Confidence
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">CME Detected:</span>
                              <p className="font-medium text-green-400">
                                {file.mlResults!.prediction.cme_detected ? '✅ Yes' : '❌ No'}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Probability:</span>
                              <p className="font-medium">
                                {(file.mlResults!.prediction.probability * 100).toFixed(1)}%
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Model Version:</span>
                              <p className="font-medium">{file.mlResults!.model_info.version}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Processing Time:</span>
                              <p className="font-medium">{file.mlResults!.processing_time.toFixed(2)}s</p>
                            </div>
                          </div>

                          {file.mlResults!.prediction.cme_detected && (
                            <div className="mt-3 p-3 rounded border border-orange-500/20 bg-orange-500/5">
                              <h6 className="font-medium text-orange-400 mb-2">⚠️ CME Event Details</h6>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Severity:</span>
                                  <p className="font-medium capitalize">{file.mlResults!.prediction.severity}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Estimated Speed:</span>
                                  <p className="font-medium">{file.mlResults!.prediction.estimated_speed} km/s</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Features Used:</span>
                                  <p className="font-medium">{file.mlResults!.features_analyzed}</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Overview */}
      <Card className="space-card">
        <CardHeader>
          <CardTitle className="text-cosmic">Data Management Overview</CardTitle>
          <CardDescription>
            Monitor data coverage, import SWIS files, and export analysis results
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-3 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <Database className="h-5 w-5 text-blue-400" />
              <div>
                <p className="text-sm font-medium text-blue-400">Data Coverage</p>
                <p className="text-xs text-muted-foreground">
                  {dataSummary?.data_coverage || '98.7%'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <FileText className="h-5 w-5 text-green-400" />
              <div>
                <p className="text-sm font-medium text-green-400">Total Files</p>
                <p className="text-xs text-muted-foreground">
                  {dataSummary?.total_cme_events || 15} CDF files
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <Clock className="h-5 w-5 text-yellow-400" />
              <div>
                <p className="text-sm font-medium text-yellow-400">Last Update</p>
                <p className="text-xs text-muted-foreground">
                  {dataSummary?.last_update ? new Date(dataSummary.last_update).toLocaleTimeString() : '2 min ago'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <AlertTriangle className="h-5 w-5 text-purple-400" />
              <div>
                <p className="text-sm font-medium text-purple-400">System Health</p>
                <p className="text-xs text-muted-foreground">
                  {dataSummary?.system_health || 'Excellent'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Quality */}
      <Card className="space-card">
        <CardHeader>
          <CardTitle className="text-cosmic">Data Quality Monitor</CardTitle>
          <CardDescription>
            Monitor data quality metrics and processing status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium">Quality Metrics</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Data Completeness</span>
                  <div className="flex items-center space-x-2">
                    <Progress value={98.7} className="w-20 h-2" />
                    <span className="text-sm font-medium">98.7%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Signal Quality</span>
                  <div className="flex items-center space-x-2">
                    <Progress value={95.2} className="w-20 h-2" />
                    <span className="text-sm font-medium">95.2%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Calibration Status</span>
                  <div className="flex items-center space-x-2">
                    <Progress value={100} className="w-20 h-2" />
                    <span className="text-sm font-medium">100%</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-medium">Processing Status</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <span className="text-sm">SWIS Data Processing</span>
                  <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/50">
                    Active
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <span className="text-sm">CME Detection</span>
                  <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/50">
                    Running
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <span className="text-sm">Threshold Optimization</span>
                  <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">
                    Scheduled
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DataImportExport;
