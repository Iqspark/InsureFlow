import Link from "next/link";

export function InfoPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link href="/dashboard" className="hover:text-indigo-600 transition-colors">
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-medium">{title}</span>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          <p className="text-sm text-slate-500 mt-1">{intro}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-6 space-y-6">
          {children}
        </div>
      </div>
    </div>
  );
}

export function InfoSection({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-slate-900 mb-2">{heading}</h2>
      <div className="text-sm text-slate-600 leading-relaxed space-y-2">{children}</div>
    </section>
  );
}
