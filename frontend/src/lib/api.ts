/**
 * API Service for Aditya-L1 CME Detection System
 * 
 * Provides functions to interact with the FastAPI backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface AnalysisRequest {
  start_date: string;
  end_date: string;
  analysis_type?: 'full' | 'quick' | 'threshold_only';
  config_overrides?: Record<string, any>;
  advanced_settings?: {
    velocityThreshold?: number;
    accelerationThreshold?: number;
    angularWidthMin?: number;
    confidenceThreshold?: number;
    includePartialHalos?: boolean;
    filterWeakEvents?: boolean;
  };
}

export interface ThresholdConfig {
  velocity_enhancement: number;
  density_enhancement: number;
  temperature_anomaly: number;
  combined_score_threshold: number;
}

export interface CMEEvent {
  datetime: string;
  speed: number;
  angular_width: number;
  source_location: string;
  estimated_arrival: string;
  confidence: number;
}

export interface AnalysisResult {
  cme_events: CMEEvent[];
  thresholds: Record<string, number>;
  performance_metrics: Record<string, number>;
  data_summary: Record<string, any>;
  charts_data: Record<string, any>;
}

export interface ParticleData {
  timestamps: string[];
  velocity: number[];
  density: number[];
  temperature: number[];
  flux: number[];
  units: {
    velocity: string;
    density: string;
    temperature: string;
    flux: string;
  };
}

export interface MLAnalysisResult {
  analysis_type: string;
  file_info: {
    filename: string;
    size_bytes: number;
    data_points: number;
  };
  ml_results: {
    events_detected: number;
    predictions: MLPrediction[];
    model_performance: ModelMetrics;
  };
  data_summary: {
    time_range: {
      start: string;
      end: string;
      duration_hours: number;
    };
    data_quality: {
      completeness: string;
      valid_measurements: number;
    };
  };
  recommendations: string[];
  timestamp: string;
}

export interface MLPrediction {
  event_id: string;
  detection_time: string;
  parameters: {
    velocity: number;
    density: number;
    temperature: number;
  };
  ml_metrics: {
    probability: number;
    confidence_score: number;
    anomaly_score: number;
  };
  physics: {
    estimated_arrival: string;
    transit_time_hours: number;
    severity: 'Low' | 'Medium' | 'High';
  };
  data_source: string;
}

export interface ModelMetrics {
  total_data_points: number;
  analysis_coverage: string;
  feature_count: number;
  detection_rate: string;
  model_version: string;
  processing_time: string;
}

export interface MLModelInfo {
  model_type: string;
  version: string;
  training_data: string;
  features: string[];
  performance_metrics: {
    accuracy: number;
    precision: number;
    recall: number;
    f1_score: number;
    auc_roc: number;
  };
  detection_capabilities: {
    min_velocity_threshold: string;
    temporal_resolution: string;
    prediction_horizon: string;
    confidence_threshold: string;
  };
  last_training: string;
  model_size: string;
  supported_formats: string[];
}

export interface UploadResult {
  filename: string;
  file_size: number;
  status: 'analyzed' | 'error';
  processing_status: 'completed' | 'failed';
  processing_time?: string;
  data_quality?: {
    total_points: number;
    valid_points: number;
    coverage_percentage: number;
    time_range: {
      start: string;
      end: string;
    };
    parameter_ranges: {
      velocity: { min: number; max: number; mean: number };
      density: { min: number; max: number; mean: number };
    };
  };
  ml_analysis?: {
    cme_events_detected: number;
    detection_method: string;
    model_confidence: string;
    analysis_timestamp: string;
  };
  detected_cme_events?: CMEEvent[];
  recommendations: string[];
  error?: string;
}

export interface DataSummary {
  mission_status: string;
  data_coverage: string;
  last_update: string;
  total_cme_events: number;
  active_alerts: number;
  system_health: string;
}

export interface RecentCMEEvent {
  date: string;
  magnitude: string;
  speed: number;
  angular_width: number;
  type: string;
  confidence: number;
}

export interface RecentCMEResponse {
  events: RecentCMEEvent[];
  total_count: number;
  date_range: string;
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new ApiError(response.status, errorText);
  }

  return response.json();
}

export const api = {
  // Health check
  async healthCheck() {
    return apiRequest<{ status: string; timestamp: string; components: Record<string, boolean> }>('/health');
  },

  // Data summary
  async getDataSummary() {
    return apiRequest<DataSummary>('/api/data/summary');
  },

  // Recent CME events
  async getRecentCMEEvents() {
    return apiRequest<RecentCMEResponse>('/api/cme/recent');
  },

  // CME Analysis
  async analyzeCMEEvents(request: AnalysisRequest) {
    return apiRequest<AnalysisResult>('/api/analyze', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  // Threshold optimization
  async optimizeThresholds(config: ThresholdConfig) {
    return apiRequest<{
      optimized_thresholds: Record<string, number>;
      optimization_method: string;
      confidence_score: number;
    }>('/api/thresholds/optimize', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  },

  // Particle data for charts
  async getParticleData() {
    return apiRequest<ParticleData>('/api/charts/particle-data');
  },

  // File upload
  async uploadSWISData(file: File): Promise<UploadResult> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/api/data/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new ApiError(response.status, errorText);
    }

    return response.json();
  },

  // ML-based CDF analysis
  async analyzeCDFWithML(file: File): Promise<MLAnalysisResult> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/api/ml/analyze-cdf`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new ApiError(response.status, errorText);
    }

    return response.json();
  },

  // Get ML model information
  async getMLModelInfo(): Promise<MLModelInfo> {
    return apiRequest<MLModelInfo>('/api/ml/model-info');
  },
};

// React Query hooks for data fetching
export const useApi = () => {
  const { useQuery, useMutation, useQueryClient } = require('@tanstack/react-query');

  return {
    // Queries
    useHealthCheck: () => useQuery({
      queryKey: ['health'],
      queryFn: api.healthCheck,
      refetchInterval: 30000, // Check every 30 seconds
    }),

    useDataSummary: () => useQuery({
      queryKey: ['data-summary'],
      queryFn: api.getDataSummary,
      refetchInterval: 60000, // Update every minute
    }),

    useParticleData: () => useQuery({
      queryKey: ['particle-data'],
      queryFn: api.getParticleData,
      refetchInterval: 300000, // Update every 5 minutes
    }),

    // Mutations
    useAnalyzeCME: () => {
      const queryClient = useQueryClient();
      return useMutation({
        mutationFn: api.analyzeCMEEvents,
        onSuccess: (data) => {
          // Invalidate and refetch related queries
          queryClient.invalidateQueries({ queryKey: ['data-summary'] });
          queryClient.setQueryData(['analysis-result'], data);
        },
      });
    },

    useOptimizeThresholds: () => {
      const queryClient = useQueryClient();
      return useMutation({
        mutationFn: api.optimizeThresholds,
        onSuccess: (data) => {
          queryClient.setQueryData(['thresholds'], data.optimized_thresholds);
        },
      });
    },

    useUploadSWISData: () => {
      const queryClient = useQueryClient();
      return useMutation({
        mutationFn: api.uploadSWISData,
        onSuccess: () => {
          // Invalidate data-related queries
          queryClient.invalidateQueries({ queryKey: ['particle-data'] });
          queryClient.invalidateQueries({ queryKey: ['data-summary'] });
        },
      });
    },

    // ML Analysis mutations
    useAnalyzeCDFWithML: () => {
      const queryClient = useQueryClient();
      return useMutation({
        mutationFn: api.analyzeCDFWithML,
        onSuccess: (data) => {
          // Cache ML analysis results
          queryClient.setQueryData(['ml-analysis', data.file_info.filename], data);
          queryClient.invalidateQueries({ queryKey: ['data-summary'] });
        },
      });
    },

    // ML Model info query
    useMLModelInfo: () => useQuery({
      queryKey: ['ml-model-info'],
      queryFn: api.getMLModelInfo,
      staleTime: 600000, // 10 minutes
    }),
  };
};

export { ApiError }; 