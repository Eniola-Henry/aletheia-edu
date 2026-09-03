/** Simple cream-ink skeleton blocks for loading states */
export function SkeletonLine({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-ink/10 ${className}`}
      aria-hidden
    />
  );
}

export function StoryMapSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-6" aria-busy>
      <SkeletonLine className="h-4 w-32" />
      <div className="flex gap-6 items-center">
        <SkeletonLine className="h-24 w-24 rounded-2xl shrink-0" />
        <div className="flex-1 space-y-3">
          <SkeletonLine className="h-8 w-2/3" />
          <SkeletonLine className="h-3 w-full max-w-md" />
          <SkeletonLine className="h-2.5 w-full max-w-sm" />
        </div>
      </div>
      {[1, 2, 3].map((i) => (
        <SkeletonLine key={i} className="h-20 w-full rounded-xl" />
      ))}
    </div>
  );
}

export function ChapterSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-6" aria-busy>
      <SkeletonLine className="h-4 w-28" />
      <SkeletonLine className="h-9 w-1/2" />
      <SkeletonLine className="h-64 w-full rounded-sm" />
      <SkeletonLine className="h-40 w-full rounded-2xl" />
    </div>
  );
}
