import { useRef, useState, ChangeEvent } from 'react';
import {
  UploadCloud,
  Layers,
  ChevronRight,
  Download,
  Cpu,
  CheckCircle2,
  Sliders,
  Maximize2,
  RefreshCw,
  FileSpreadsheet,
  FileCode,
  Sparkles,
  Target,
  AlertCircle,
  Database
} from 'lucide-react';
import ReticleCorners from './ReticleCorners';
import LunarSurfaceCanvas from './LunarSurfaceCanvas';
import MetricCard from './MetricCard';
import KeypointTelemetryRadar from './KeypointTelemetryRadar';
import { PIPELINE_STEPS } from '../data/mockData';
import { AlgorithmName, DemoPair, Keypoint, RegistrationMetrics } from '../types';

interface RegisterViewProps {
  sourceImage: string | null;
  referenceImage: string | null;
  sourceFileName: string;
  referenceFileName: string;
  sourceSensor: string;
  referenceSensor: string;
  algorithm: AlgorithmName;
  isProcessing: boolean;
  currentStepIndex: number;
  hasResults: boolean;
  warpMode: 'blend' | 'split' | 'difference';
  setWarpMode: (mode: 'blend' | 'split' | 'difference') => void;
  setSourceSensor: (sensor: string) => void;
  setReferenceSensor: (sensor: string) => void;
  setAlgorithm: (alg: AlgorithmName) => void;
  onRegisterClick: () => void;
  onSourceUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  onRefUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  showToast: (message: string, type?: 'info' | 'success') => void;
  demoPairs: DemoPair[];
  selectedDemoPairId: string;
  onSelectDemoPair: (id: string) => void;
  registeredImage: string | null;
  keypoints: Keypoint[];
  metrics: RegistrationMetrics | null;
  registrationError: string | null;
}

export default function RegisterView({
  sourceImage,
  referenceImage,
  sourceFileName,
  referenceFileName,
  sourceSensor,
  referenceSensor,
  algorithm,
  isProcessing,
  currentStepIndex,
  hasResults,
  warpMode,
  setWarpMode,
  setSourceSensor,
  setReferenceSensor,
  setAlgorithm,
  onRegisterClick,
  onSourceUpload,
  onRefUpload,
  showToast,
  demoPairs,
  selectedDemoPairId,
  onSelectDemoPair,
  registeredImage,
  keypoints,
  metrics,
  registrationError
}: RegisterViewProps) {
  const sourceInputRef = useRef<HTMLInputElement | null>(null);
  const refInputRef = useRef<HTMLInputElement | null>(null);

  const [isSourceDragging, setIsSourceDragging] = useState(false);
  const [isRefDragging, setIsRefDragging] = useState(false);
  const [showTripleView, setShowTripleView] = useState(false);

  return (
    <div className="space-y-4 pb-8 animate-fadeIn">
      {/* DEMO PAIR SELECTOR BAR (FETCHED FROM BACKEND) */}
      <div className="bg-[#0E1522]/95 border border-[#1C283B] rounded-lg p-3 shadow-lg flex flex-wrap items-center justify-between gap-3 backdrop-blur">
        <div className="flex items-center gap-2.5 flex-wrap">
          <Database className="w-4 h-4 text-[#FF9F43]" />
          <span className="font-mono text-xs font-bold text-slate-200 uppercase tracking-wider">
            DEMO IMAGE PAIR:
          </span>
          <select
            value={selectedDemoPairId}
            onChange={(e) => onSelectDemoPair(e.target.value)}
            disabled={isProcessing}
            className="bg-[#121B27] border border-[#223246] rounded px-3 py-1.5 text-xs font-mono text-amber-300 focus:outline-none focus:border-[#FF9F43]"
          >
            {demoPairs.length === 0 ? (
              <option value="">Loading demo pairs from server...</option>
            ) : (
              demoPairs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} ({p.source_sensor} &harr; {p.reference_sensor})
                </option>
              ))
            )}
          </select>
        </div>
        {selectedDemoPairId && (
          <div className="font-mono text-[10px] text-slate-400 truncate max-w-md hidden sm:block">
            {demoPairs.find((p) => p.id === selectedDemoPairId)?.description}
          </div>
        )}
      </div>

      {/* REAL ERROR BANNER ON PIPELINE FAILURE */}
      {registrationError && (
        <div className="p-4 rounded-lg border border-red-500/50 bg-red-950/40 text-red-200 text-xs font-mono flex items-start gap-3 shadow-xl animate-slideUp">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold uppercase tracking-wider text-red-400 flex items-center gap-2">
              <span>REGISTRATION PIPELINE ERROR</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-red-900/60 rounded border border-red-700">
                INSUFFICIENT INLIERS
              </span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed font-sans">{registrationError}</p>
            <div className="text-[10px] text-slate-400 pt-1 font-mono">
              SUGGESTION: Try switching to <span className="text-amber-400">RIFT2-style (Phase Congruency)</span> or another demo pair with higher optical overlap.
            </div>
          </div>
        </div>
      )}
      {/* BENTO GRID: ROW 1 (SOURCE & REFERENCE VIEWPORTS) */}
      <div className="grid grid-cols-12 gap-4">
        {/* SOURCE VIEWPORT BENTO CARD */}
        <div
          className={`col-span-12 lg:col-span-6 bg-[#0F1622]/85 border rounded-lg p-3.5 relative shadow-xl backdrop-blur transition-all duration-300 ${
            isSourceDragging
              ? 'border-[#FF9F43] bg-[#FF9F43]/10 shadow-[0_0_24px_rgba(255,159,67,0.25)]'
              : 'border-[#FF9F43]/40 hover:border-[#FF9F43]/80'
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsSourceDragging(true);
          }}
          onDragLeave={() => setIsSourceDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsSourceDragging(false);
            if (e.dataTransfer.files?.[0]) {
              const file = e.dataTransfer.files[0];
              onSourceUpload({
                target: { files: [file] }
              } as unknown as ChangeEvent<HTMLInputElement>);
            }
          }}
        >
          <ReticleCorners color="#FF9F43" size="w-3 h-3" />

          {/* Bento Header */}
          <div className="flex justify-between items-center mb-2.5">
            <span className="font-mono text-[9px] font-bold text-[#FF9F43] bg-[#FF9F43]/10 border border-[#FF9F43]/30 px-2 py-0.5 rounded tracking-wider">
              SOURCE [{sourceSensor}]
            </span>
            <span className="font-mono text-[9px] text-slate-500">
              0.25m/px &bull; VIS-PAN &bull; CH-2
            </span>
          </div>

          {/* Viewport Box */}
          <div
            onClick={() => sourceInputRef.current?.click()}
            className="h-44 sm:h-48 bg-[#070B10] rounded border border-slate-800 relative flex items-center justify-center overflow-hidden group cursor-pointer shadow-inner"
          >
            {sourceImage ? (
              <img
                src={sourceImage}
                alt="Source preview"
                className="w-full h-full object-cover select-none"
              />
            ) : (
              <LunarSurfaceCanvas type="source" />
            )}

            {/* Scanning line sweep during processing */}
            {isProcessing && (
              <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#FF9F43] to-transparent shadow-[0_0_16px_#FF9F43] animate-scanBeam pointer-events-none z-20" />
            )}

            {/* Animated targeting reticle corners */}
            <div className="absolute w-8 h-8 border-t-2 border-l-2 border-[#FF9F43] top-2 left-2 opacity-60 pointer-events-none" />
            <div className="absolute w-8 h-8 border-b-2 border-r-2 border-[#FF9F43] bottom-2 right-2 opacity-60 pointer-events-none" />

            <span className="font-mono text-[10px] text-slate-500/80 absolute top-2 right-3 pointer-events-none">
              TELEMETRY LOCK ACTIVE
            </span>

            {/* Hover hint */}
            <div className="absolute inset-0 bg-[#0A0E14]/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-xs font-mono text-amber-300 z-10">
              <UploadCloud className="w-5 h-5 text-[#FF9F43] animate-bounce" />
              <span className="font-bold text-[11px]">CLICK OR DROP SOURCE FILE</span>
              <span className="text-[9px] text-slate-400">PDS4 / GeoTIFF / PNG</span>
            </div>

            <input
              type="file"
              ref={sourceInputRef}
              onChange={onSourceUpload}
              accept="image/*"
              className="hidden"
            />
          </div>

          {/* Bento Footer Metadata */}
          <div className="mt-2.5 flex items-center justify-between text-xs">
            <div className="font-mono text-[10px] text-slate-400 truncate max-w-[220px]">
              FILE: <span className="text-slate-200">{sourceFileName}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-[10px] font-mono text-slate-500">SENSOR:</label>
              <select
                value={sourceSensor}
                onChange={(e) => setSourceSensor(e.target.value)}
                disabled={isProcessing}
                className="bg-[#131C28] border border-[#233246] rounded px-2 py-0.5 text-[10px] font-mono text-amber-300 focus:outline-none focus:border-[#FF9F43]"
              >
                <option value="OHRC">OHRC (0.25 m/px)</option>
                <option value="TMC-2">TMC-2 (5.0 m/px)</option>
                <option value="IIRS">IIRS (Hyperspectral)</option>
              </select>
            </div>
          </div>
        </div>

        {/* REFERENCE VIEWPORT BENTO CARD */}
        <div
          className={`col-span-12 lg:col-span-6 bg-[#0F1622]/85 border rounded-lg p-3.5 relative shadow-xl backdrop-blur transition-all duration-300 ${
            isRefDragging
              ? 'border-[#3FD0E0] bg-[#3FD0E0]/10 shadow-[0_0_24px_rgba(63,208,224,0.25)]'
              : 'border-[#3FD0E0]/40 hover:border-[#3FD0E0]/80'
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsRefDragging(true);
          }}
          onDragLeave={() => setIsRefDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsRefDragging(false);
            if (e.dataTransfer.files?.[0]) {
              const file = e.dataTransfer.files[0];
              onRefUpload({
                target: { files: [file] }
              } as unknown as ChangeEvent<HTMLInputElement>);
            }
          }}
        >
          <ReticleCorners color="#3FD0E0" size="w-3 h-3" />

          {/* Bento Header */}
          <div className="flex justify-between items-center mb-2.5">
            <span className="font-mono text-[9px] font-bold text-[#3FD0E0] bg-[#3FD0E0]/10 border border-[#3FD0E0]/30 px-2 py-0.5 rounded tracking-wider">
              REFERENCE [{referenceSensor}]
            </span>
            <span className="font-mono text-[9px] text-slate-500">
              0.50m/px &bull; GROUND TRUTH &bull; LRO
            </span>
          </div>

          {/* Viewport Box */}
          <div
            onClick={() => refInputRef.current?.click()}
            className="h-44 sm:h-48 bg-[#070B10] rounded border border-slate-800 relative flex items-center justify-center overflow-hidden group cursor-pointer shadow-inner"
          >
            {referenceImage ? (
              <img
                src={referenceImage}
                alt="Reference preview"
                className="w-full h-full object-cover select-none"
              />
            ) : (
              <LunarSurfaceCanvas type="reference" />
            )}

            {/* Scanning line sweep during processing */}
            {isProcessing && (
              <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#3FD0E0] to-transparent shadow-[0_0_16px_#3FD0E0] animate-scanBeam pointer-events-none z-20" />
            )}

            {/* Animated targeting reticle corners */}
            <div className="absolute w-8 h-8 border-t-2 border-l-2 border-[#3FD0E0] top-2 left-2 opacity-60 pointer-events-none" />
            <div className="absolute w-8 h-8 border-b-2 border-r-2 border-[#3FD0E0] bottom-2 right-2 opacity-60 pointer-events-none" />

            <span className="font-mono text-[10px] text-slate-500/80 absolute top-2 right-3 pointer-events-none">
              REFERENCE SYNCED
            </span>

            {/* Hover hint */}
            <div className="absolute inset-0 bg-[#0A0E14]/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-xs font-mono text-cyan-300 z-10">
              <UploadCloud className="w-5 h-5 text-[#3FD0E0] animate-bounce" />
              <span className="font-bold text-[11px]">CLICK OR DROP REFERENCE FILE</span>
              <span className="text-[9px] text-slate-400">PDS4 / GeoTIFF / PNG</span>
            </div>

            <input
              type="file"
              ref={refInputRef}
              onChange={onRefUpload}
              accept="image/*"
              className="hidden"
            />
          </div>

          {/* Bento Footer Metadata */}
          <div className="mt-2.5 flex items-center justify-between text-xs">
            <div className="font-mono text-[10px] text-slate-400 truncate max-w-[220px]">
              FILE: <span className="text-slate-200">{referenceFileName}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-[10px] font-mono text-slate-500">SENSOR:</label>
              <select
                value={referenceSensor}
                onChange={(e) => setReferenceSensor(e.target.value)}
                disabled={isProcessing}
                className="bg-[#131C28] border border-[#233246] rounded px-2 py-0.5 text-[10px] font-mono text-cyan-300 focus:outline-none focus:border-[#3FD0E0]"
              >
                <option value="LROC NAC">LROC NAC (0.50 m/px)</option>
                <option value="LROC WAC">LROC WAC (100 m/px)</option>
                <option value="SELENE TC">SELENE TC (10 m/px)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* PIPELINE CONTROL & REGISTER TRIGGER BAR */}
      {!isProcessing && (
        <div className="bg-[#0E1522]/90 border border-[#1B2636] rounded-lg p-3 shadow-lg flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 font-mono text-xs">
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-400 text-[11px]">ALGORITHM:</span>
              <select
                value={algorithm}
                onChange={(e) => setAlgorithm(e.target.value as AlgorithmName)}
                className="bg-[#121B27] border border-[#223246] rounded px-2.5 py-1 text-xs font-mono text-amber-300 focus:outline-none focus:border-[#FF9F43]"
              >
                <option value="RIFT2-style (Phase Congruency)">
                  RIFT2-style (Phase Congruency + Max Moments) — Recommended
                </option>
                <option value="SuperGlue (Deep Graph Neural Network)">
                  SuperGlue (Graph Neural Feature Matching)
                </option>
                <option value="AKAZE (Non-linear Scale Space)">
                  AKAZE (Non-linear Scale Space Filtering)
                </option>
                <option value="SIFT (Scale-Invariant Feature Transform)">
                  SIFT (Difference of Gaussians + 128D Hist)
                </option>
              </select>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 font-mono text-[10px] text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span>HOMOGRAPHY 8-DOF [RANSAC FSC GATE 1.5px]</span>
            </div>
          </div>

          <button
            onClick={onRegisterClick}
            className="px-6 py-2.5 rounded font-mono font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-[#FF9F43] to-[#ff8514] text-black shadow-lg shadow-[#FF9F43]/20 hover:shadow-[#FF9F43]/40 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center gap-2 cursor-pointer animate-pulseGlow"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-black opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-black"></span>
            </span>
            <span>REGISTER IMAGES</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 6-STEP HORIZONTAL PROGRESS STEPPER (ACTIVE DURING PROCESSING) */}
      {isProcessing && (
        <div className="p-3.5 rounded-lg border border-[#FF9F43]/40 bg-[#0E1522] shadow-2xl animate-fadeIn space-y-2.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2 text-[#FF9F43]">
              <Cpu className="w-4 h-4 animate-spin" />
              <span className="font-bold">
                SOLVING CORRESPONDENCES // STEP {currentStepIndex + 1} OF 6:
              </span>
              <span className="text-slate-200 uppercase font-semibold">
                {PIPELINE_STEPS[currentStepIndex]?.name}
              </span>
            </div>
            <span className="text-[10px] text-slate-400">
              ESTIMATED CONVERGENCE: ~{(6 - currentStepIndex) * 0.7}s
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {PIPELINE_STEPS.map((step, idx) => {
              const isCompleted = idx < currentStepIndex;
              const isActive = idx === currentStepIndex;

              return (
                <div
                  key={step.name}
                  className={`p-2.5 rounded border transition-all duration-300 text-xs font-mono ${
                    isActive
                      ? 'border-[#FF9F43] bg-[#FF9F43]/15 shadow-[0_0_12px_rgba(255,159,67,0.35)]'
                      : isCompleted
                      ? 'border-emerald-500/40 bg-emerald-950/25 text-slate-300'
                      : 'border-slate-800 bg-[#090D13]/60 text-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] text-slate-500 font-bold">0{idx + 1}</span>
                    {isCompleted ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : isActive ? (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF9F43] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF9F43]"></span>
                      </span>
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                    )}
                  </div>
                  <div
                    className={`font-semibold text-[10px] truncate ${
                      isActive ? 'text-[#FF9F43]' : isCompleted ? 'text-emerald-300' : 'text-slate-500'
                    }`}
                  >
                    {step.name}
                  </div>
                  <div className="text-[9px] text-slate-500 truncate mt-0.5">{step.sub}</div>
                </div>
              );
            })}
          </div>

          <div className="text-[10px] font-mono text-slate-400 pt-1 border-t border-[#1C283B]">
            STAGE LOG: {PIPELINE_STEPS[currentStepIndex]?.details}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* BENTO GRID: RESULTS SECTION */}
      {/* ==================================================================== */}
      {hasResults && (
        <div className="space-y-4 animate-slideUp">
          {/* BENTO ROW: 4 TELEMETRY METRIC TILES */}
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-6 sm:col-span-3">
              <MetricCard
                title="RMSE (Pixel)"
                value={metrics?.rmse ?? 0}
                decimals={2}
                unit="px"
                description="Mean re-projection residual"
                quality={metrics && metrics.rmse < 2.0 ? 'NOMINAL < 2.0px' : 'ACCEPTABLE'}
                qualityColor={metrics && metrics.rmse < 2.0 ? '#10B981' : '#FF9F43'}
                progressPercent={metrics ? Math.max(15, Math.min(100, Math.round((2.0 / Math.max(0.2, metrics.rmse)) * 75))) : 80}
                trigger={hasResults}
              />
            </div>
            <div className="col-span-6 sm:col-span-3">
              <MetricCard
                title="Inlier Count"
                value={metrics?.inlier_count ?? keypoints.length}
                decimals={0}
                unit="pts"
                description="RANSAC-verified match points"
                quality={metrics && metrics.inlier_count > 25 ? 'HIGH DENSITY' : metrics && metrics.inlier_count > 0 ? 'CONVERGED' : 'SPARSE'}
                qualityColor="#FF9F43"
                progressPercent={metrics ? Math.min(100, Math.round(metrics.inlier_count * 2.5)) : 70}
                trigger={hasResults}
              />
            </div>
            <div className="col-span-6 sm:col-span-3">
              <MetricCard
                title="Inlier Ratio"
                value={metrics ? parseFloat((metrics.inlier_ratio * 100).toFixed(1)) : 0}
                decimals={1}
                unit="%"
                description="Consensus support ratio"
                quality={metrics && metrics.inlier_ratio > 0.4 ? 'EXCELLENT' : 'CONVERGED'}
                qualityColor="#3FD0E0"
                progressPercent={metrics ? Math.min(100, Math.round(metrics.inlier_ratio * 100)) : 75}
                trigger={hasResults}
              />
            </div>
            <div className="col-span-6 sm:col-span-3">
              <MetricCard
                title="Dispersion Score"
                value={metrics?.distribution_score ?? 0}
                decimals={2}
                unit=""
                description="Spatial Delaunay spread"
                quality={metrics && metrics.distribution_score > 0.5 ? 'UNIFORM SPREAD' : 'LOCALIZED'}
                qualityColor="#A78BFA"
                progressPercent={metrics ? Math.min(100, Math.round((metrics.distribution_score ?? 0) * 100)) : 70}
                trigger={hasResults}
              />
            </div>
          </div>

          {/* BENTO ROW: RADAR DISPERSION MATRIX (8 COLS) + OUTPUT PREVIEW & EXPORT (4 COLS) */}
          <div className="grid grid-cols-12 gap-4">
            {/* DATA VISUALIZER / RADAR (COL-SPAN-12 LG:COL-SPAN-8) */}
            <div className="col-span-12 lg:col-span-8">
              <KeypointTelemetryRadar keypoints={keypoints} />
            </div>

            {/* REGISTERED OUTPUT PREVIEW & BENTO EXPORT (COL-SPAN-12 LG:COL-SPAN-4) */}
            <div className="col-span-12 lg:col-span-4 bg-[#0A0E14] border border-[#1C2737] rounded-lg p-3 flex flex-col justify-between shadow-xl">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[10px] font-bold text-slate-200 uppercase tracking-wider">
                    REGISTERED CO-ALIGNMENT
                  </span>
                  <div className="flex items-center gap-1 font-mono text-[9px]">
                    <button
                      onClick={() => setWarpMode('blend')}
                      className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                        warpMode === 'blend'
                          ? 'bg-[#FF9F43]/20 text-[#FF9F43] border border-[#FF9F43]/50'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      Overlay
                    </button>
                    <button
                      onClick={() => setWarpMode('split')}
                      className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                        warpMode === 'split'
                          ? 'bg-[#3FD0E0]/20 text-[#3FD0E0] border border-[#3FD0E0]/50'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      Split
                    </button>
                    <button
                      onClick={() => setWarpMode('difference')}
                      className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                        warpMode === 'difference'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      Diff
                    </button>
                  </div>
                </div>

                {/* Viewport Box */}
                <div className="h-52 bg-black rounded border border-slate-800 relative overflow-hidden flex items-center justify-center">
                  <div className="absolute inset-0">
                    {referenceImage ? (
                      <img
                        src={referenceImage}
                        alt="Reference base"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <LunarSurfaceCanvas type="reference" />
                    )}
                  </div>

                  <div
                    className={`absolute inset-0 transition-all duration-300 ${
                      warpMode === 'blend'
                        ? 'opacity-85 mix-blend-screen'
                        : warpMode === 'split'
                        ? 'opacity-90 mix-blend-difference'
                        : 'opacity-80 mix-blend-hard-light filter contrast-125'
                    }`}
                  >
                    {registeredImage ? (
                      <img
                        src={registeredImage}
                        alt="Source warped"
                        className="w-full h-full object-cover"
                      />
                    ) : sourceImage ? (
                      <img
                        src={sourceImage}
                        alt="Source fallback"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <LunarSurfaceCanvas type="source" />
                    )}
                  </div>

                  {/* High-tech sub-pixel matrix grid */}
                  <div className="absolute inset-0 pointer-events-none border border-emerald-500/20 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px] opacity-25" />

                  <div className="font-mono text-[9px] text-emerald-400 absolute bottom-2 right-2 bg-black/75 px-1.5 py-0.5 rounded border border-emerald-500/30">
                    PRECISION LOCK: SUB-PX
                  </div>
                </div>
              </div>

              {/* Bento Action Download Buttons */}
              <div className="mt-3 flex flex-col gap-2">
                <button
                  onClick={() => {
                    if (registeredImage) {
                      const a = document.createElement('a');
                      a.href = registeredImage;
                      a.download = `registered_${sourceFileName.replace(/\.[^/.]+$/, '')}.png`;
                      a.click();
                      showToast('Downloaded registered image.', 'success');
                    } else {
                      showToast('No registered image available to download.', 'info');
                    }
                  }}
                  className="w-full p-2 bg-[#FF9F43]/10 border border-[#FF9F43]/30 rounded flex items-center justify-between cursor-pointer hover:bg-[#FF9F43]/20 transition-all"
                >
                  <span className="font-mono text-[10px] text-[#FF9F43] font-bold">
                    DOWNLOAD REGISTERED RASTER
                  </span>
                  <Download className="w-3.5 h-3.5 text-[#FF9F43]" />
                </button>

                <button
                  onClick={() => {
                    if (keypoints && keypoints.length > 0) {
                      const header = 'id,source_x,source_y,ref_x,ref_y,dx,dy,residual_px,confidence\n';
                      const rows = keypoints.map(k => `${k.id},${k.x},${k.y},${k.refX},${k.refY},${k.dx},${k.dy},${k.residual},${k.confidence}`).join('\n');
                      const blob = new Blob([header + rows], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `match_points_${sourceFileName.replace(/\.[^/.]+$/, '')}.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                      showToast(`Exported ${keypoints.length} verified tie-points to CSV`, 'success');
                    } else {
                      showToast('No tie-points available to export.', 'info');
                    }
                  }}
                  className="w-full p-2 border border-[#3FD0E0]/30 bg-[#3FD0E0]/5 rounded flex items-center justify-between cursor-pointer hover:bg-[#3FD0E0]/15 transition-all"
                >
                  <span className="font-mono text-[10px] text-[#3FD0E0] font-bold">
                    MATCH POINTS (CSV)
                  </span>
                  <FileSpreadsheet className="w-3.5 h-3.5 text-[#3FD0E0]" />
                </button>

                <button
                  onClick={() => {
                    if (metrics) {
                      const report = {
                        source_file: sourceFileName,
                        reference_file: referenceFileName,
                        sensor_pair: `${sourceSensor} -> ${referenceSensor}`,
                        algorithm,
                        metrics,
                        keypoints_count: keypoints.length,
                        keypoints,
                        timestamp: new Date().toISOString()
                      };
                      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `registration_telemetry_${sourceFileName.replace(/\.[^/.]+$/, '')}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                      showToast('Registration telemetry report saved as JSON', 'success');
                    } else {
                      showToast('No telemetry metrics available to export.', 'info');
                    }
                  }}
                  className="w-full p-2 border border-slate-700 bg-slate-900/40 rounded flex items-center justify-between cursor-pointer hover:bg-slate-800 transition-all"
                >
                  <span className="font-mono text-[10px] text-slate-300">JSON REPORT</span>
                  <FileCode className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>
            </div>
          </div>

          {/* TOGGLEABLE SPATIAL REGISTRATION TRIPLE-VIEW BENTO ROW */}
          <div className="bg-[#0E1522]/90 border border-[#1C283B] rounded-lg p-3.5 shadow-xl">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowTripleView(!showTripleView)}
                className="flex items-center gap-2 font-mono text-xs font-bold text-slate-200 uppercase tracking-wider hover:text-white transition-colors cursor-pointer"
              >
                <Layers className="w-4 h-4 text-amber-400" />
                <span>EXPANDED DUAL-SENSOR COMPARISON VIEW</span>
                <span className="text-[10px] font-mono text-slate-500 ml-2">
                  [{showTripleView ? 'HIDE' : 'SHOW'}]
                </span>
              </button>
              <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">
                SOURCE &bull; REFERENCE &bull; WARPED MOSAIC
              </span>
            </div>

            {showTripleView && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-3.5 pt-3 border-t border-[#182433] animate-fadeIn">
                {/* Column 1: Source */}
                <div className="relative rounded border border-[#FF9F43]/60 bg-[#070B10] p-2">
                  <ReticleCorners color="#FF9F43" size="w-2.5 h-2.5" />
                  <div className="flex justify-between items-center text-[10px] font-mono text-[#FF9F43] mb-1.5 font-bold">
                    <span>SOURCE ({sourceSensor})</span>
                    <span className="text-slate-500 font-normal">UNWARPED</span>
                  </div>
                  <div className="h-40 rounded overflow-hidden relative bg-black">
                    {sourceImage ? (
                      <img src={sourceImage} alt="Source" className="w-full h-full object-cover" />
                    ) : (
                      <LunarSurfaceCanvas type="source" />
                    )}
                  </div>
                </div>

                {/* Column 2: Reference */}
                <div className="relative rounded border border-[#3FD0E0]/60 bg-[#070B10] p-2">
                  <ReticleCorners color="#3FD0E0" size="w-2.5 h-2.5" />
                  <div className="flex justify-between items-center text-[10px] font-mono text-[#3FD0E0] mb-1.5 font-bold">
                    <span>REFERENCE ({referenceSensor})</span>
                    <span className="text-slate-500 font-normal">GROUND TRUTH</span>
                  </div>
                  <div className="h-40 rounded overflow-hidden relative bg-black">
                    {referenceImage ? (
                      <img src={referenceImage} alt="Reference" className="w-full h-full object-cover" />
                    ) : (
                      <LunarSurfaceCanvas type="reference" />
                    )}
                  </div>
                </div>

                {/* Column 3: Registered Output */}
                <div className="relative rounded p-2 overflow-hidden [background:linear-gradient(#070B10,#070B10)_padding-box,linear-gradient(135deg,#FF9F43,#3FD0E0)_border-box] border-2 border-transparent shadow-[0_0_16px_rgba(63,208,224,0.15)]">
                  <ReticleCorners color="#10B981" size="w-2.5 h-2.5" />
                  <div className="flex justify-between items-center text-[10px] font-mono mb-1.5 font-bold">
                    <span className="text-amber-300">REGISTERED WARP</span>
                    <span className="text-emerald-400 font-normal">ALIGNED</span>
                  </div>
                  <div className="h-40 rounded overflow-hidden relative bg-black">
                    <div className="absolute inset-0">
                      {referenceImage ? (
                        <img src={referenceImage} alt="Reference" className="w-full h-full object-cover" />
                      ) : (
                        <LunarSurfaceCanvas type="reference" />
                      )}
                    </div>
                    <div className="absolute inset-0 opacity-80 mix-blend-screen">
                      {registeredImage ? (
                        <img src={registeredImage} alt="Registered Source" className="w-full h-full object-cover" />
                      ) : sourceImage ? (
                        <img src={sourceImage} alt="Source" className="w-full h-full object-cover" />
                      ) : (
                        <LunarSurfaceCanvas type="source" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
