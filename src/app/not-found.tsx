import Link from 'next/link';

export const dynamic = 'force-static';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#0A154F] font-bold text-2xl mb-6 shadow-sm">
        404
      </div>
      <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
        Page Not Found
      </h1>
      <p className="text-slate-600 max-w-md mb-8 text-sm">
        The page you are looking for does not exist or may have been moved.
      </p>
      <Link
        href="/"
        className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-[#0A154F] text-white font-semibold text-sm hover:opacity-90 shadow-md transition-opacity"
      >
        Back to Home
      </Link>
    </div>
  );
}
