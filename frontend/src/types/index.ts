// frontend/src/types/index.ts

export interface SearchOptions {
  google?: boolean;
  bing?: boolean;
  telegramApi?: boolean;
  social?: boolean;
  aiAnalysis?: boolean;
  sentimentAnalysis?: boolean;
  maxResults?: number;
}

export interface SearchResult {
  id: string;
  title: string;
  url: string;
  snippet: string;
  source: 'telegram' | 'google' | 'bing' | 'social';
  confidence: number;
  type: 'channel' | 'group' | 'user' | 'unknown';
  members?: number;
  timestamp?: string;
  verified?: boolean;
  metadata?: Record<string, any>;
}

export interface SearchResponse {
  success: boolean;
  service: string;
  message: string;
  data: {
    username: string;
    searchId: string;
    timestamp: string;
    sources: Record<string, SearchResult[]>;
    totalResults: number;
    errors: Array<{ source: string; error: string }>;
    duration: number;
    aiAnalysis?: AIAnalysis;
  };
  timestamp: string;
}

export interface AIAnalysis {
  individualAnalyses: Array<{
    id: string;
    credibility: CredibilityAnalysis;
    sentiment: SentimentAnalysis;
    entities: EntityAnalysis;
    threats: ThreatAnalysis;
  }>;
  globalAnalysis: {
    confidenceScore: number;
    patterns: string[];
    recommendations: string[];
    summary: {
      totalSources: number;
      totalResults: number;
      highConfidenceResults: number;
      uniqueEntities: number;
    };
  };
  stats: {
    totalResults: number;
    analyzedResults: number;
    failedAnalyses: number;
  };
}

export interface CredibilityAnalysis {
  score: number;
  reliability: 'high' | 'medium' | 'low';
  indicators: string[];
  warnings: string[];
}

export interface SentimentAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  emotions: string[];
  tone: string;
}

export interface EntityAnalysis {
  persons: string[];
  organizations: string[];
  locations: string[];
  keywords: string[];
  links: string[];
}

export interface ThreatAnalysis {
  level: 'low' | 'medium' | 'high' | 'critical';
  indicators: string[];
  risks: string[];
  recommendations: string[];
}

export interface FrameworkHealth {
  gateway: string;
  version: string;
  timestamp: string;
  services: Record<string, {
    status: 'healthy' | 'unhealthy' | 'disabled';
    response?: any;
    error?: string;
  }>;
}

export interface FrameworkInfo {
  name: string;
  version: string;
  environment: string;
  services: Array<{
    name: string;
    enabled: boolean;
    endpoints: string[];
    url: string | null;
  }>;
}

export interface Investigation {
  id: string;
  title: string;
  description: string;
  target: string;
  status: 'active' | 'completed' | 'archived';
  createdAt: string;
  updatedAt: string;
  results: SearchResult[];
  analysis?: AIAnalysis;
  tags: string[];
  notes: string;
}

export interface TaskStatus {
  id: string;
  type: 'comprehensive_search' | 'cross_reference' | 'timeline_analysis';
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  startTime: string;
  endTime?: string;
  result?: any;
  error?: string;
}

export interface ServiceStats {
  service: string;
  version: string;
  uptime: number;
  apis: Record<string, boolean>;
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  investigations: {
    total: number;
    today: number;
  };
}

// Enums pour les constantes
export enum SearchSourceType {
  TELEGRAM = 'telegram',
  GOOGLE = 'google',
  BING = 'bing',
  SOCIAL = 'social',
  WEB_INTEL = 'webIntel',
  IMAGE_INTEL = 'imageIntel'
}

export enum ResultType {
  CHANNEL = 'channel',
  GROUP = 'group',
  USER = 'user',
  UNKNOWN = 'unknown'
}

export enum ConfidenceLevel {
  VERY_LOW = 0,
  LOW = 25,
  MEDIUM = 50,
  HIGH = 75,
  VERY_HIGH = 90
}

// Interfaces pour les composants UI
export interface TabItem {
  id: string;
  label: string;
  icon?: React.ComponentType;
  component: React.ComponentType;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export interface LoadingState {
  isLoading: boolean;
  message?: string;
  progress?: number;
}

export interface NotificationState {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
  id: string;
}