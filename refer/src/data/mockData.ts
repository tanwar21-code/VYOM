import { Keypoint, AlgorithmBenchmark, SensorSpec, PipelineStep } from '../types';

export const PIPELINE_STEPS: PipelineStep[] = [
  {
    name: 'Resampling',
    sub: 'Bicubic grid alignment',
    details: 'Standardizing spatial resolution to 0.25 m/px GSD via bicubic projective sampling.'
  },
  {
    name: 'Preprocessing',
    sub: 'Phase congruency calc',
    details: 'Log-Gabor multi-scale orientation filtering to eliminate non-uniform lunar shadows.'
  },
  {
    name: 'Detecting Features',
    sub: 'Log-Gabor corner extract',
    details: 'Calculating maximum and minimum phase congruency moments for invariant feature points.'
  },
  {
    name: 'Matching',
    sub: 'Nearest-neighbor ratio test',
    details: 'Log-polar descriptor cosine distance evaluation with Lowe threshold 0.75.'
  },
  {
    name: 'Filtering Outliers',
    sub: 'RANSAC FSC verification',
    details: 'Fast Sample Consensus pruning geometric outliers with 1.5px residual gate.'
  },
  {
    name: 'Warping',
    sub: 'Homography matrix transform',
    details: 'Computing 8-DOF projective homography matrix H with sub-pixel spline interpolation.'
  }
];

export const MOCK_KEYPOINTS: Keypoint[] = Array.from({ length: 44 }).map((_, i) => {
  // Deterministic procedural points mapped across 560x340 space
  const seed = (i * 47) % 360;
  const rad = (seed * Math.PI) / 180;
  const radius = 55 + ((i * 31) % 190);
  const cx = 280 + Math.cos(rad) * radius * 1.15;
  const cy = 170 + Math.sin(rad) * radius * 0.75;
  
  // Realistic slight displacement error vectors
  const dx = parseFloat((Math.sin(i * 1.7) * 4.2).toFixed(2));
  const dy = parseFloat((Math.cos(i * 2.3) * 3.8).toFixed(2));
  const residual = parseFloat((0.45 + Math.abs(Math.sin(i * 0.9)) * 1.42).toFixed(2));
  const confidence = parseFloat((0.82 + Math.abs(Math.cos(i * 1.3)) * 0.17).toFixed(2));

  return {
    id: `KP-${(1000 + i).toString().padStart(4, '0')}`,
    x: Math.round(Math.max(30, Math.min(530, cx))),
    y: Math.round(Math.max(25, Math.min(315, cy))),
    refX: Math.round(Math.max(30, Math.min(530, cx + dx))),
    refY: Math.round(Math.max(25, Math.min(315, cy + dy))),
    dx,
    dy,
    residual,
    confidence
  };
});

export const ALGORITHM_BENCHMARKS: AlgorithmBenchmark[] = [
  {
    id: 'rift2',
    name: 'RIFT2-style',
    tag: 'RECOMMENDED',
    engine: 'Phase Congruency + Max Moments',
    rmse: 1.38,
    inliers: 49,
    ratio: 84.6,
    score: 0.82,
    runtime: 1.84,
    isBestRmse: true,
    isBestRatio: true,
    isBestScore: true,
    description: 'Radiation-invariant feature transform leveraging frequency-domain phase congruency rather than gradient magnitudes. Fully resilient to extreme solar phase angles.'
  },
  {
    id: 'superglue',
    name: 'SuperGlue',
    tag: 'NEURAL GNN',
    engine: 'Attentional Graph Neural Network',
    rmse: 1.62,
    inliers: 56,
    ratio: 81.2,
    score: 0.79,
    runtime: 3.42,
    isBestInliers: true,
    description: 'Deep graph neural network matching SuperPoint keypoints using self- and cross-attention mechanisms. High inlier density with higher computational overhead.'
  },
  {
    id: 'akaze',
    name: 'AKAZE',
    tag: 'NON-LINEAR',
    engine: 'Fast Explicit Diffusion (FED)',
    rmse: 1.95,
    inliers: 38,
    ratio: 68.4,
    score: 0.69,
    runtime: 1.12,
    isBestRuntime: true,
    description: 'Constructs non-linear scale space using Fast Explicit Diffusion to preserve crater boundary boundaries while filtering high-frequency noise.'
  },
  {
    id: 'sift',
    name: 'SIFT',
    tag: 'CLASSICAL',
    engine: 'Difference of Gaussians (DoG)',
    rmse: 2.21,
    inliers: 29,
    ratio: 54.1,
    score: 0.58,
    runtime: 1.35,
    description: 'Standard scale-invariant feature transform with 128-D gradient orientation histograms. Degrades sharply under non-linear illumination variance across orbits.'
  }
];

export const SENSOR_SPECS: SensorSpec[] = [
  {
    sensor: 'OHRC',
    mission: 'Chandrayaan-2 (ISRO)',
    resolution: '0.25 m / pixel',
    band: '450–900 nm (Panchromatic)',
    swath: '12 km @ 100 km orbit'
  },
  {
    sensor: 'TMC-2',
    mission: 'Chandrayaan-2 (ISRO)',
    resolution: '5.0 m / pixel',
    band: 'Triplet Stereo (Fore, Nadir, Aft)',
    swath: '20 km (Stereo DEM)'
  },
  {
    sensor: 'IIRS',
    mission: 'Chandrayaan-2 (ISRO)',
    resolution: '80 m / pixel',
    band: '0.8–5.0 µm (250 bands)',
    swath: '20 km Hyperspectral'
  },
  {
    sensor: 'LROC NAC',
    mission: 'LRO (NASA / ASU)',
    resolution: '0.50 – 2.0 m / pixel',
    band: 'Panchromatic Line Scan',
    swath: '5 km @ 50 km orbit'
  },
  {
    sensor: 'LROC WAC',
    mission: 'LRO (NASA / ASU)',
    resolution: '100 m (Global)',
    band: '7 UV/Visible Filters',
    swath: '105 km Swath'
  },
  {
    sensor: 'SELENE TC',
    mission: 'Kaguya (JAXA)',
    resolution: '10.0 m / pixel',
    band: 'Stereo Panchromatic',
    swath: '35 km Swath'
  }
];
