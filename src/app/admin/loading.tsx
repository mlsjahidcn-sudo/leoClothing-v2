/**
 * Route-level loading state for /admin/*
 *
 * Shown by Next.js when:
 *  - The user navigates between admin routes (server-rendered route transition)
 *  - The page's `useEffect` data fetch is in flight on first paint
 *
 * The skeleton here is intentionally generic — pages render their own
 * granular loading states (skeleton cards, spinners) once the AdminShell
 * has authenticated and mounted. This file just keeps the route from
 * painting a blank canvas during the transition.
 */
export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-gray-200 rounded" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-gray-200 rounded-lg" />
        ))}
      </div>
      <div className="h-64 bg-gray-200 rounded-lg" />
    </div>
  );
}
