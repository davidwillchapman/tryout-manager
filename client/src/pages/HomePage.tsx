export function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 min-h-full p-8">
      <div className="flex flex-col items-center gap-6 text-center">
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="80" height="80" rx="16" fill="#021C2F" />
          <path d="M20 55 L40 20 L60 55 Z" fill="#FCCF09" stroke="#FCCF09" strokeWidth="2" strokeLinejoin="round" />
          <rect x="33" y="42" width="14" height="3" rx="1.5" fill="#021C2F" />
        </svg>
        <div>
          <h1 className="text-4xl font-bold text-gold tracking-tight">Sideline Sidekick</h1>
          <p className="text-muted mt-2 text-base">Your all-in-one coaching companion.</p>
        </div>
      </div>
    </div>
  );
}
