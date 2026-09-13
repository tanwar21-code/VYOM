import { useState, useEffect, ChangeEvent } from 'react';
import {
  Crosshair,
  BarChart3,
  Info,
  ChevronLeft,
  ChevronRight,
  Radio,
  Satellite,
  Clock,
  Sparkles,
  Shield,
  Activity
} from 'lucide-react';
import StarfieldCanvas from './components/StarfieldCanvas';
import TopoBackground from './components/TopoBackground';
import RegisterView from './components/RegisterView';
import CompareView from './components/CompareView';
import AboutView from './components/AboutView';
import { NavTab, AlgorithmName, DemoPair, Keypoint, RegistrationMetrics } from './types';
import { API_BASE_URL } from './config';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('register');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  // Uploaded and active images state with real File objects
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [sourceFileName, setSourceFileName] = useState<string>('source.png');
  const [referenceFileName, setReferenceFileName] = useState<string>('reference.png');
  const [sourceSensor, setSourceSensor] = useState<string>('OHRC');
  const [referenceSensor, setReferenceSensor] = useState<string>('LROC NAC');
  const [algorithm, setAlgorithm] = useState<AlgorithmName>(
    'RIFT2-style (Phase Congruency)'
  );

  // Backend demo pairs state
  const [demoPairs, setDemoPairs] = useState<DemoPair[]>([]);
  const [selectedDemoPairId, setSelectedDemoPairId] = useState<string>('');

  // Real registration state machine
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [hasResults, setHasResults] = useState<boolean>(false);
  const [warpMode, setWarpMode] = useState<'blend' | 'split' | 'difference'>('blend');
  const [registeredImage, setRegisteredImage] = useState<string | null>(null);
  const [keypoints, setKeypoints] = useState<Keypoint[]>([]);
  const [metrics, setMetrics] = useState<RegistrationMetrics | null>(null);
  const [registrationError, setRegistrationError] = useState<string | null>(null);

  // Live Mission Clock (UTC)
  const [utcTime, setUtcTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(
        now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC'
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Toast notification system
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'success'; id: number } | null>(
    null
  );

  const showToast = (message: string, type: 'info' | 'success' = 'info') => {
    const id = Date.now();
    setToast({ message, type, id });
    setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 4000);
  };

  // Helper to load a demo pair from backend
  const loadDemoPairById = async (pairId: string, pairsList?: DemoPair[]) => {
    const list = pairsList || demoPairs;
    const pair = list.find((p) => p.id === pairId);
    if (!pair) return;

    setSelectedDemoPairId(pair.id);
    setSourceSensor(pair.source_sensor);
    setReferenceSensor(pair.reference_sensor);
    setSourceFileName(pair.source_file || 'source.png');
    setReferenceFileName(pair.reference_file || 'reference.png');
    setRegistrationError(null);
    setHasResults(false);
    setRegisteredImage(null);
    setKeypoints([]);
    setMetrics(null);

    try {
      if (pair.source_url) {
        const res = await fetch(`${API_BASE_URL}${pair.source_url}`);
        if (res.ok) {
          const blob = await res.blob();
          const file = new File([blob], pair.source_file || 'source.png', { type: blob.type || 'image/png' });
          setSourceFile(file);
          setSourceImage(URL.createObjectURL(blob));
        } else {
          console.warn(`Failed to load source image: HTTP ${res.status}`);
        }
      }
      if (pair.reference_url) {
        const res = await fetch(`${API_BASE_URL}${pair.reference_url}`);
        if (res.ok) {
          const blob = await res.blob();
          const file = new File([blob], pair.reference_file || 'reference.png', { type: blob.type || 'image/png' });
          setReferenceFile(file);
          setReferenceImage(URL.createObjectURL(blob));
        } else {
          console.warn(`Failed to load reference image: HTTP ${res.status}`);
        }
      }
    } catch (e) {
      console.error('Failed to load demo pair assets from backend:', e);
    }
  };

  // Fetch demo pairs on mount from backend
  useEffect(() => {
    fetch(`${API_BASE_URL}/demo-pairs`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch demo pairs`);
        return res.json();
      })
      .then((data: DemoPair[]) => {
        setDemoPairs(data);
        if (data.length > 0) {
          loadDemoPairById(data[0].id, data);
        }
      })
      .catch((err) => {
        console.warn(`Backend server at ${API_BASE_URL} not reachable:`, err);
        setRegistrationError(`Backend server at ${API_BASE_URL} not reachable. Ensure FastAPI is running on port 8000.`);
      });
  }, []);

  // Real backend registration flow
  const handleRegister = async () => {
    if (isProcessing) return;
    if (!sourceFile || !referenceFile) {
      setRegistrationError('Both source and reference image files are required. Please select or upload images.');
      showToast('Please upload or select both images.', 'info');
      return;
    }

    setIsProcessing(true);
    setHasResults(false);
    setRegistrationError(null);
    setCurrentStepIndex(0);

    // Dynamic progress stepper while waiting for real backend
    let step = 0;
    const interval = setInterval(() => {
      if (step < 4) {
        step += 1;
        setCurrentStepIndex(step);
      }
    }, 600);

    try {
      const formData = new FormData();
      formData.append('source_image', sourceFile);
      formData.append('reference_image', referenceFile);
      formData.append('sensor_pair', `${sourceSensor} -> ${referenceSensor}`);
      formData.append('algorithm', algorithm);

      const res = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        body: formData,
      });

      clearInterval(interval);
      setCurrentStepIndex(5); // Warping step

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      if (data.success) {
        setRegisteredImage(data.registered_image);
        setKeypoints(data.matches || []);
        setMetrics(data.metrics);
        setHasResults(true);
        setRegistrationError(null);
        showToast(
          `Registration Converged: ${data.metrics?.inlier_count ?? data.matches?.length} tie-points verified (RMSE ${data.metrics?.rmse?.toFixed(2)} px)`,
          'success'
        );
      } else {
        setHasResults(false);
        setRegistrationError(data.error || 'Registration algorithm could not find sufficient inlier matches.');
        showToast(data.error || 'Registration failed.', 'info');
      }
    } catch (err: any) {
      clearInterval(interval);
      setHasResults(false);
      setRegistrationError(err.message || `Failed to connect to backend server at ${API_BASE_URL}.`);
      showToast('Backend server connection failed.', 'info');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSourceUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSourceFile(file);
      setSourceFileName(file.name);
      setSourceImage(URL.createObjectURL(file));
      setRegistrationError(null);
      showToast(`Source file ingested: ${file.name}`, 'info');
    }
  };

  const handleRefUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setReferenceFile(file);
      setReferenceFileName(file.name);
      setReferenceImage(URL.createObjectURL(file));
      setRegistrationError(null);
      showToast(`Reference file ingested: ${file.name}`, 'info');
    }
  };

  return (
    <div className="relative min-h-screen bg-[#0A0E14] text-slate-100 font-sans flex flex-col selection:bg-[#FF9F43] selection:text-black">
      {/* Dynamic Starfield Canvas Background */}
      <StarfieldCanvas />

      {/* Topographic Contour Line Overlay at ~4% opacity */}
      <TopoBackground />

      {/* TOP HEADER BAR — BENTO THEME */}
      <header className="relative z-30 h-12 border-b border-[#1B2636] bg-[#0D131C] px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-[#FF9F43] to-[#d97d26] flex items-center justify-center text-black font-mono font-black text-xs shadow-[0_0_12px_rgba(255,159,67,0.35)] shrink-0">
            ISRO
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] text-slate-400 tracking-widest uppercase">
              ISRO-SAC / MISSION LUNAR v2.4
            </span>
            <span className="hidden md:inline-block h-3.5 w-px bg-slate-800" />
            <span className="hidden md:inline-block font-mono text-[10px] text-[#FF9F43]">
              SOURCE: CHANDRAYAAN-2 {sourceSensor}
            </span>
          </div>
        </div>

        {/* Live Mission Clock & Telemetry Badges */}
        <div className="flex items-center gap-3 sm:gap-4 font-mono text-[11px]">
          <div className="hidden lg:flex items-center gap-2 text-slate-400">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="text-[10px]">DOWNLINK: 142.4 Mbps</span>
          </div>

          <div className="text-slate-400 text-[10px] sm:text-[11px]">
            MISSION ELAPSED: <span className="text-amber-400 font-bold">{utcTime || '04:12:38:12 UTC'}</span>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER: SIDEBAR + CONTENT VIEWPORT */}
      <div className="relative z-20 flex-1 flex overflow-hidden">
        {/* LEFT SIDEBAR — BENTO THEME */}
        <aside
          className={`relative z-20 flex flex-col justify-between border-r border-[#1B2636] bg-[#0C1119] transition-all duration-300 ${
            sidebarCollapsed ? 'w-16' : 'w-56 lg:w-60'
          }`}
        >
          {/* Top navigation items */}
          <div className="p-3 space-y-2">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#16202E]">
              {!sidebarCollapsed && (
                <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500 font-bold">
                  FLIGHT NAVIGATION
                </span>
              )}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-1 rounded hover:bg-[#15202E] text-slate-500 hover:text-slate-300 transition-colors cursor-pointer ml-auto"
                title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {sidebarCollapsed ? (
                  <ChevronRight className="w-3.5 h-3.5" />
                ) : (
                  <ChevronLeft className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            {/* Nav item 1: Register */}
            <button
              onClick={() => setActiveTab('register')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded font-mono text-xs transition-all duration-200 cursor-pointer ${
                activeTab === 'register'
                  ? 'bg-[#152132] text-[#FF9F43] border-l-2 border-[#FF9F43] font-bold shadow-[0_0_12px_rgba(255,159,67,0.15)]'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-[#111924] border-l-2 border-transparent'
              }`}
            >
              <Crosshair className="w-4 h-4 shrink-0 text-[#FF9F43]" />
              {!sidebarCollapsed && <span className="truncate">Register</span>}
            </button>

            {/* Nav item 2: Compare Algorithms */}
            <button
              onClick={() => setActiveTab('compare')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded font-mono text-xs transition-all duration-200 cursor-pointer ${
                activeTab === 'compare'
                  ? 'bg-[#152132] text-[#3FD0E0] border-l-2 border-[#3FD0E0] font-bold shadow-[0_0_12px_rgba(63,208,224,0.15)]'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-[#111924] border-l-2 border-transparent'
              }`}
            >
              <BarChart3 className="w-4 h-4 shrink-0 text-[#3FD0E0]" />
              {!sidebarCollapsed && <span className="truncate">Compare Algorithms</span>}
            </button>

            {/* Nav item 3: About */}
            <button
              onClick={() => setActiveTab('about')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded font-mono text-xs transition-all duration-200 cursor-pointer ${
                activeTab === 'about'
                  ? 'bg-[#152132] text-purple-300 border-l-2 border-purple-400 font-bold shadow-[0_0_12px_rgba(168,85,247,0.15)]'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-[#111924] border-l-2 border-transparent'
              }`}
            >
              <Info className="w-4 h-4 shrink-0 text-purple-400" />
              {!sidebarCollapsed && <span className="truncate">About</span>}
            </button>
          </div>

          {/* Bottom telemetry status: Pulsing green dot */}
          <div className="p-3 border-t border-[#16202E] bg-[#070B10]/70 flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></div>
            {!sidebarCollapsed && (
              <div className="font-mono text-[10px] leading-tight">
                <div className="text-emerald-400 font-bold tracking-wider">SYSTEM READY</div>
                <div className="text-slate-600 text-[9px]">DAWN-4 NODE ONLINE</div>
              </div>
            )}
          </div>
        </aside>

        {/* MAIN VIEWPORT */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-5">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'register' && (
              <RegisterView
                sourceImage={sourceImage}
                referenceImage={referenceImage}
                sourceFileName={sourceFileName}
                referenceFileName={referenceFileName}
                sourceSensor={sourceSensor}
                referenceSensor={referenceSensor}
                algorithm={algorithm}
                isProcessing={isProcessing}
                currentStepIndex={currentStepIndex}
                hasResults={hasResults}
                warpMode={warpMode}
                setWarpMode={setWarpMode}
                setSourceSensor={setSourceSensor}
                setReferenceSensor={setReferenceSensor}
                setAlgorithm={setAlgorithm}
                onRegisterClick={handleRegister}
                onSourceUpload={handleSourceUpload}
                onRefUpload={handleRefUpload}
                showToast={showToast}
                demoPairs={demoPairs}
                selectedDemoPairId={selectedDemoPairId}
                onSelectDemoPair={(id) => loadDemoPairById(id)}
                registeredImage={registeredImage}
                keypoints={keypoints}
                metrics={metrics}
                registrationError={registrationError}
              />
            )}

            {activeTab === 'compare' && (
              <CompareView
                sourceImage={sourceImage}
                referenceImage={referenceImage}
                sourceSensor={sourceSensor}
                referenceSensor={referenceSensor}
                sourceFile={sourceFile}
                referenceFile={referenceFile}
              />
            )}

            {activeTab === 'about' && <AboutView />}
          </div>
        </main>
      </div>

      {/* TOAST NOTIFICATION POPUP */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-slideUp">
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-[#1E2E44] bg-[#0A0E14]/95 backdrop-blur-md shadow-2xl text-xs font-mono text-slate-100">
            <span className="w-2 h-2 rounded-full bg-[#FF9F43] animate-pulse" />
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
