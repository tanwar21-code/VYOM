import {
  Compass,
  Layers,
  Sparkles,
  Database,
  Cpu,
  CheckCircle2,
  AlertCircle,
  Binary,
  GitBranch,
  ShieldCheck
} from 'lucide-react';
import {
  KEY_METRICS,
  METHODOLOGY_STAGES,
  METHODOLOGY_PARAMS,
  SENSOR_SPECS,
  REAL_ALGORITHM_BENCHMARKS
} from '../data/methodology';

export default function AboutView() {
  const steps = METHODOLOGY_STAGES;

  return (
    <div className="max-w-4xl mx-auto py-4 px-2 space-y-10 pb-16 animate-fadeIn">
      {/* Document Header */}
      <div className="border-b border-[#1C283B] pb-6">
        <div className="flex items-center gap-2.5 text-xs font-mono text-amber-400 mb-2">
          <span className="w-2 h-2 rounded-full bg-[#FF9F43]" />
          <span>ISRO SPACE APPLICATIONS CENTRE (SAC) // MISSION BRIEFING</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          Lunar Image Registration & Multimodal Alignment
        </h1>
        <p className="text-sm font-sans text-slate-400 mt-2 leading-relaxed">
          Technical architecture, sensor calibration models, and phase congruency algorithms powering
          sub-pixel co-registration between Chandrayaan-2 and NASA Lunar Reconnaissance Orbiter data.
        </p>
      </div>

      {/* 1. THE PROBLEM */}
      <section className="space-y-3">
        <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-[#FF9F43]" />
          <span>The Problem: Extreme Lunar Polar Illumination</span>
        </h2>
        <div className="p-5 rounded-lg border border-[#1C283B] bg-[#0E1522]/90 backdrop-blur space-y-3 text-sm text-slate-300 leading-relaxed font-sans">
          <p>
            The lunar South Pole is characterized by grazing solar elevation angles (often under 2&deg; to 5&deg;),
            casting dramatic, cast shadows across crater rims and permanently shadowed regions (PSRs).
            Standard orbital imagery captured at different times or by different spacecraft (such as ISRO's
            Chandrayaan-2 OHRC and NASA's LRO NAC) experience severe non-linear radiometric variance.
          </p>
          <p>
            Conventional feature descriptors like SIFT or ORB rely on local intensity gradients. When the
            illumination vector reverses or sweeps by 90&deg;, crater shadows invert, causing gradient-based
            matchers to hallucinate false correspondences or drop below usable inlier thresholds (&lt; 25%).
            Achieving sub-pixel accuracy requires illumination-invariant structural signatures.
          </p>
        </div>
      </section>

      {/* 2. OUR APPROACH (4-Step horizontal connected flow) */}
      <section className="space-y-4">
        <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-[#3FD0E0]" />
          <span>Our Approach: 4-Stage Resilient Pipeline</span>
        </h2>

        <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Connecting line on desktop */}
          <div className="hidden lg:block absolute top-7 left-12 right-12 h-0.5 border-t-2 border-dashed border-[#1D2B3D] pointer-events-none z-0" />

          {steps.map((st, idx) => (
            <div
              key={st.name}
              className="relative z-10 p-4 rounded-lg border border-[#1C283B] bg-[#0E1522] hover:border-slate-600 transition-all duration-200 group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="w-8 h-8 rounded-full border border-slate-700 bg-[#070B10] flex items-center justify-center font-mono text-xs font-bold text-amber-400 group-hover:border-[#FF9F43] transition-colors">
                  0{idx + 1}
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500/70" />
              </div>
              <h3 className="font-mono text-xs font-bold text-slate-100 uppercase tracking-wide mb-1.5">
                {st.name}
              </h3>
              <p className="text-xs text-slate-400 font-sans leading-normal">{st.details}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. KEY METRICS CALLOUT PULL-QUOTES */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-lg border border-[#FF9F43]/40 bg-[#0E1522] shadow-lg">
          <div className="text-3xl font-mono font-bold text-[#FF9F43]">
            {KEY_METRICS.accuracy.value}
          </div>
          <div className="text-xs font-mono text-slate-300 font-semibold mt-1">
            {KEY_METRICS.accuracy.label}
          </div>
          <p className="text-xs text-slate-400 mt-2 font-sans">
            {KEY_METRICS.accuracy.description}
          </p>
        </div>

        <div className="p-5 rounded-lg border border-[#3FD0E0]/40 bg-[#0E1522] shadow-lg">
          <div className="text-3xl font-mono font-bold text-[#3FD0E0]">
            {KEY_METRICS.inlierRatio.value}
          </div>
          <div className="text-xs font-mono text-slate-300 font-semibold mt-1">
            {KEY_METRICS.inlierRatio.label}
          </div>
          <p className="text-xs text-slate-400 mt-2 font-sans">
            {KEY_METRICS.inlierRatio.description}
          </p>
        </div>

        <div className="p-5 rounded-lg border border-purple-500/40 bg-[#0E1522] shadow-lg">
          <div className="text-3xl font-mono font-bold text-purple-400">
            {KEY_METRICS.convergenceTime.value}
          </div>
          <div className="text-xs font-mono text-slate-300 font-semibold mt-1">
            {KEY_METRICS.convergenceTime.label}
          </div>
          <p className="text-xs text-slate-400 mt-2 font-sans">
            {KEY_METRICS.convergenceTime.description}
          </p>
        </div>
      </section>

      {/* 4. DATASETS USED */}
      <section className="space-y-3">
        <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <Database className="w-4 h-4 text-[#FF9F43]" />
          <span>Datasets & Orbital Instruments</span>
        </h2>

        <div className="rounded-lg border border-[#1C283B] bg-[#0E1522] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="bg-[#080C12] text-slate-400 border-b border-[#1C283B] text-[11px] uppercase">
                  <th className="py-2.5 px-4">Sensor Instrument</th>
                  <th className="py-2.5 px-4">Orbiter / Mission</th>
                  <th className="py-2.5 px-4">Spatial GSD</th>
                  <th className="py-2.5 px-4">Spectral Regime</th>
                  <th className="py-2.5 px-4">Swath Profile</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#151F2C]">
                {SENSOR_SPECS.map((s) => (
                  <tr key={s.sensor} className="hover:bg-[#121A26]">
                    <td className="py-2.5 px-4 font-bold text-amber-300">{s.sensor}</td>
                    <td className="py-2.5 px-4 text-slate-300">{s.mission}</td>
                    <td className="py-2.5 px-4 text-cyan-300 font-semibold">{s.resolution}</td>
                    <td className="py-2.5 px-4 text-slate-400">{s.band}</td>
                    <td className="py-2.5 px-4 text-slate-400">{s.swath}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 5. ALGORITHMS EVALUATED */}
      <section className="space-y-3">
        <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-[#3FD0E0]" />
          <span>Evaluated Registration Frameworks</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {REAL_ALGORITHM_BENCHMARKS.map((a) => (
            <div
              key={a.id}
              className="p-4 rounded-lg border border-[#1C283B] bg-[#0E1522] space-y-2 hover:border-slate-600 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-white">{a.name}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {a.tag}
                </span>
              </div>
              <div className="text-[11px] font-mono text-amber-400">{a.engine}</div>
              <p className="text-xs text-slate-400 font-sans leading-relaxed">{a.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 6. SYSTEM LIMITATIONS (PLAINLY STYLED, VISUALLY MUTED) */}
      <section className="p-4 rounded-lg border border-slate-800/80 bg-[#080C12]/80 space-y-2 text-xs font-sans text-slate-400">
        <h3 className="font-mono font-bold text-slate-400 text-[11px] uppercase tracking-wider">
          Known Operational Constraints & Caveats
        </h3>
        <ul className="list-disc pl-5 space-y-1 text-slate-400 text-[11px] leading-relaxed">
          <li>
            Permanently Shadowed Regions (PSRs) exhibiting zero SNR optical return require synthetic
            aperture radar (SAR) or laser altimeter (LOLA) co-registration rather than optical phase congruency.
          </li>
          <li>
            Severe slope topography (&gt; 45&deg;) creates geometric occlusion that non-rigid homography
            cannot resolve without an underlying 3D Digital Elevation Model (DEM).
          </li>
          <li>
            Processing speeds and geometric metrics are computed live via the backend registration engine
            wrapping OpenCV and Phase Congruency; production cluster nodes scale across multi-threaded and GPU-accelerated workers.
          </li>
        </ul>
      </section>
    </div>
  );
}
