import Card from "../components/ui/Card";
import { IconFileText, IconCpu, IconTarget, IconCloudUpload, IconShield, IconBolt } from "../components/icons/Icons";

const FEATURE_STRIP = [
  { icon: IconCpu, title: "AI-Powered Extraction", desc: "AI reads & structures chemical & mechanical data" },
  { icon: IconTarget, title: "Accurate Comparison", desc: "Against 300+ standards (ASTM, EN, JIS & more)" },
  { icon: IconFileText, title: "Instant Reports", desc: "Pass/Fail results with detailed breakdown. Download in 1 click" },
  { icon: IconShield, title: "Trusted & Reliable", desc: "Built for quality teams who demand precision" },
];

function ShieldLogo({ size = "w-10 h-10" }) {
  return (
    <div className={`relative shrink-0 ${size}`}>
      <div
        className="absolute inset-0 bg-gradient-to-br from-accent to-accent-strong shadow-md shadow-accent/30"
        style={{ clipPath: "polygon(50% 0%, 100% 20%, 100% 58%, 50% 100%, 0% 58%, 0% 20%)" }}
      />
      <span className="relative z-10 flex items-center justify-center w-full h-full text-white font-extrabold text-base">
        S
      </span>
    </div>
  );
}

export default function Landing({ onNavigate }) {
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onNavigate("auto", file);
  };

  return (
    <div className="h-screen w-full overflow-hidden bg-canvas flex flex-col">
      {/* Header — logo only */}
      <header className="shrink-0 bg-surface border-b border-border">
        <div className="max-w-[1600px] mx-auto w-full px-6 md:px-12 py-3.5 flex items-center">
          <div className="flex items-center gap-2.5">
            <ShieldLogo size="w-9 h-9" />
            <div className="leading-tight">
              <p className="font-extrabold text-ink text-[15px]">Steel Grade</p>
              <p className="text-muted text-[11px] -mt-0.5">Comparison System</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0 relative overflow-y-auto">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-surface-2 via-canvas to-surface-2" />

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
                src="/grade.png"
                alt="Manual Compare Result and Auto Match top 5 matches preview"
                className="w-full h-auto rounded-2xl shadow-lg"
              />
            </div>
          </div>

          {/* Feature strip */}
          <Card className="!p-6 sm:!p-7">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-7 sm:gap-5 sm:divide-x sm:divide-border">
              {FEATURE_STRIP.map((f, i) => (
                <div key={f.title} className={`flex items-start gap-3.5 ${i > 0 ? "sm:pl-5" : ""}`}>
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 bg-accent/10 text-accent">
                    <f.icon className="w-7 h-7" strokeWidth={1.8} />
                  </div>
                  <div>
                    <p className="text-base font-bold text-ink leading-tight">{f.title}</p>
                    <p className="text-sm text-muted mt-1.5 leading-snug">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
