export type NavTab = 'register' | 'compare' | 'about';

export type SensorSource = 'OHRC' | 'TMC-2' | 'IIRS';
export type SensorReference = 'LROC_NAC' | 'LROC_WAC' | 'SELENE_TC';

export type AlgorithmName =
  | 'RIFT2-style (Phase Congruency)'
  | 'SuperGlue (Deep Graph Neural Network)'
  | 'AKAZE (Non-linear Scale Space)'
  | 'SIFT (Scale-Invariant Feature Transform)';

export interface Keypoint {
  id: string;
  x: number;
  y: number;
  refX: number;
  refY: number;
  dx: number;
  dy: number;
  residual: number;
  confidence: number;
}

export interface PipelineStep {
  name: string;
  sub: string;
  details: string;
}

export interface AlgorithmBenchmark {
  id: string;
  name: string;
  tag: string;
  engine: string;
  rmse: number;
  inliers: number;
  ratio: number;
  score: number;
  runtime: number;
  isBestRmse?: boolean;
  isBestInliers?: boolean;
  isBestRatio?: boolean;
  isBestScore?: boolean;
  isBestRuntime?: boolean;
  description: string;
}

export interface SensorSpec {
  sensor: string;
  mission: string;
  resolution: string;
  band: string;
  swath: string;
}

export interface RegistrationMetrics {
  rmse: number;
  inlier_count: number;
  inlier_ratio: number;
  distribution_score: number;
  runtime?: number;
  inlierCount?: number;
  inlierRatio?: number;
  distributionScore?: number;
}

export interface DemoPair {
  id: string;
  title: string;
  source_sensor: string;
  reference_sensor: string;
  source_file: string | null;
  reference_file: string | null;
  description: string;
  files: string[];
  source_url: string | null;
  reference_url: string | null;
}
