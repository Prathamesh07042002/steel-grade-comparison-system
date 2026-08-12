import { IconFileText, IconCpu, IconTarget, IconCloudUpload, IconShield, IconBolt } from "../components/icons/Icons";
import logoSharada from "../assets/logo-sharada.png";
import logo from "../assets/logo.png";

const FEATURE_STRIP = [
  { icon: IconCpu, title: "AI-Powered Extraction", desc: "AI reads & structures chemical & mechanical data" },
  { icon: IconTarget, title: "Accurate Comparison", desc: "Against 300+ standards (ASTM, EN, JIS & more)" },
  { icon: IconFileText, title: "Instant Reports", desc: "Pass/Fail results with detailed breakdown. Download in 1 click" },
  { icon: IconShield, title: "Trusted & Reliable", desc: "Built for quality teams who demand precision" },
];

export default function Landing({ onNavigate }) {
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onNavigate("manual", file);
  };

  return (
    <div className="h-screen w-full overflow-hidden bg-canvas flex flex-col">
      {/* Header — app name left, Sharada logo right */}
      <header className="relative shrink-0 bg-accent/5 overflow-hidden">
        {/* decorative dot pattern, fading toward the edges */}
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, var(--color-accent) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
            maskImage: "linear-gradient(to right, transparent 0%, black 20%, black 80%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 20%, black 80%, transparent 100%)",
          }}
        />
        {/* soft glow blobs */}
        <div className="absolute -top-16 left-1/3 w-64 h-64 rounded-full bg-accent/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 right-1/4 w-56 h-56 rounded-full bg-accent-strong/10 blur-3xl pointer-events-none" />

        <div className="relative max-w-[1600px] mx-auto w-full px-3 md:px-6 py-3 flex items-center justify-between gap-3">
          <div className="relative w-[137px] h-16 overflow-hidden shrink-0">
            <img
              src={logo}
              alt="Test Certificate Compliance"
              className="absolute -top-[20px] -left-[11px] w-[156px] h-[104px] max-w-none"
            />
          </div>
          <img
            src={logoSharada}
            alt="Sharada"
            className="h-10 w-auto object-contain shrink-0"
          />
        </div>

        {/* gradient accent underline */}
        <div className="h-[3px] w-full bg-gradient-to-r from-transparent via-accent to-transparent" />
      </header>

      <main className="flex-1 min-h-0 relative isolate overflow-y-auto">
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-surface-2 via-canvas to-surface-2" />

          {/* soft orange glow blobs */}
          <div className="absolute -top-24 -right-24 w-[420px] h-[420px] rounded-full bg-accent/10 blur-3xl" />
          <div className="absolute -bottom-32 -left-20 w-[380px] h-[380px] rounded-full bg-accent-strong/10 blur-3xl" />

          {/* dot grid */}
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage: "radial-gradient(circle, var(--color-accent) 1px, transparent 1px)",
              backgroundSize: "26px 26px",
              maskImage: "radial-gradient(ellipse at center, black 0%, transparent 70%)",
              WebkitMaskImage: "radial-gradient(ellipse at center, black 0%, transparent 70%)",
            }}
          />

          {/* orange wave */}
          <svg
            className="absolute bottom-0 left-0 w-full h-32 sm:h-40 text-accent"
            viewBox="0 0 1600 200"
            preserveAspectRatio="none"
            fill="currentColor"
          >
            <path
              opacity="0.08"
              d="M0,120 C200,180 400,60 600,100 C800,140 1000,40 1200,80 C1400,120 1500,60 1600,90 L1600,200 L0,200 Z"
            />
            <path
              opacity="0.12"
              d="M0,160 C220,110 420,190 640,150 C860,110 1060,180 1280,140 C1420,116 1520,150 1600,140 L1600,200 L0,200 Z"
            />
          </svg>
        </div>

        <div className="max-w-[1600px] mx-auto w-full min-h-full px-6 md:px-12 flex flex-col justify-center gap-6 py-6">
          {/* Hero */}
          <div className="grid lg:grid-cols-[0.9fr_1.45fr] gap-6 xl:gap-10 items-center">
            {/* Left — copy + upload */}
            <div>
              <span className="inline-flex items-center gap-1.5 bg-accent/10 border border-accent/20 text-accent text-sm font-bold tracking-wide uppercase px-4 py-2 rounded-full mb-5">
                <IconBolt className="w-4 h-4" /> AI-Powered &nbsp;•&nbsp; Fast &nbsp;•&nbsp; Accurate
              </span>
              <h1 className="text-4xl sm:text-5xl xl:text-[3.25rem] font-extrabold text-ink leading-[1.12] tracking-tight">
                Instantly Verify
                <br />
                or Identify
                <br />
                <span className="text-accent">Steel Grades</span>
              </h1>
              <p className="text-muted text-base sm:text-lg mt-5 leading-relaxed max-w-full lg:max-w-md xl:max-w-lg">
                Upload a test certificate or test PDF and instantly know if it meets
                spec or which grade it matches best — in seconds, not hours.
              </p>

              <label className="mt-7 block cursor-pointer group max-w-full lg:max-w-md xl:max-w-lg">
                <div className="border-2 border-dashed border-accent/30 group-hover:border-accent group-hover:bg-accent/5 rounded-2xl px-8 py-10 text-center transition-colors bg-accent/[0.03]">
                  <div className="w-16 h-16 rounded-2xl bg-accent/10 text-accent flex items-center justify-center mx-auto mb-4">
                    <IconCloudUpload className="w-8 h-8" strokeWidth={1.6} />
                  </div>
                  <h3 className="text-lg font-bold text-ink">Upload Test Certificate or PDF</h3>
                  <p className="text-base text-muted mt-1.5">Drag &amp; drop your file here or click to browse</p>
                  <p className="text-sm text-muted/70 mt-2.5">PDF up to 25MB</p>
                </div>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </label>
            </div>

            {/* Right — dashboard preview */}
            <div className="relative w-full">
              <div
                className="absolute -top-6 -right-4 w-24 h-24 -z-10 opacity-60 pointer-events-none hidden sm:block"
                style={{
                  backgroundImage: "radial-gradient(circle, var(--color-accent) 1.5px, transparent 1.5px)",
                  backgroundSize: "14px 14px",
                }}
              />

              <img
                src={`${import.meta.env.BASE_URL}grade.png`}
                alt="Manual Compare Result and Auto Match top 5 matches preview"
                className="w-full h-auto rounded-2xl shadow-lg"
              />
            </div>
          </div>

          {/* Feature strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-5">
            {FEATURE_STRIP.map((f) => (
              <div
                key={f.title}
                className="flex items-start gap-3.5 rounded-2xl border border-accent/30 bg-accent/10 p-5"
              >
                <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 bg-accent text-white shadow-md shadow-accent/30">
                  <f.icon className="w-7 h-7" strokeWidth={1.8} />
                </div>
                <div>
                  <p className="text-base font-bold text-ink leading-tight">{f.title}</p>
                  <p className="text-sm text-muted mt-1.5 leading-snug">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
