// ─── Skeleton Placeholders ───
// Shimmer/pulse skeleton components for dashboard loading states

// ─── Shared Skeleton Primitive ───

function Bone({ className }: { readonly className: string }) {
  return <div className={`bg-muted animate-pulse ${className}`} />;
}

// ─── Stats Card Skeleton ───

function StatsCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex-1 min-w-[140px]">
      <Bone className="h-3 w-[60%] rounded-md" />
      <Bone className="h-7 w-[40%] rounded-md mt-2" />
      <Bone className="h-6 w-full rounded-md mt-2" />
      <Bone className="h-3 w-[80%] rounded-md mt-2" />
    </div>
  );
}

// ─── Agent Card Skeleton ───

function AgentCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <div className="flex items-center gap-3.5 mb-4">
        <Bone className="w-12 h-12 rounded-[14px] shrink-0" />
        <div className="flex-1 min-w-0">
          <Bone className="h-4 w-[70%] rounded-md" />
          <Bone className="h-3 w-[50%] rounded-md mt-2" />
        </div>
      </div>
      <Bone className="h-5 w-full rounded-md mb-2.5" />
      <div className="flex justify-between">
        <Bone className="h-3 w-[45%] rounded-md" />
        <Bone className="h-3 w-[20%] rounded-md" />
      </div>
    </div>
  );
}

// ─── Audit Row Skeleton ───

function AuditRowSkeleton() {
  return (
    <tr className="border-b border-border">
      <td className="px-4 py-2.5">
        <Bone className="w-7 h-7 rounded-full" />
      </td>
      <td className="px-4 py-2.5">
        <Bone className="h-4 w-24 rounded-md" />
      </td>
      <td className="px-4 py-2.5">
        <Bone className="h-4 w-20 rounded-md" />
      </td>
      <td className="px-4 py-2.5">
        <Bone className="h-5 w-14 rounded-xl" />
      </td>
      <td className="px-4 py-2.5">
        <Bone className="h-5 w-16 rounded-xl" />
      </td>
      <td className="px-4 py-2.5">
        <Bone className="h-4 w-16 rounded-md" />
      </td>
    </tr>
  );
}

// ─── Chart / Area Skeleton ───

function ChartSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <Bone className="h-[200px] w-full rounded-lg" />
    </div>
  );
}

// ─── Full Dashboard Skeleton (initial load) ───

function DashboardSkeleton() {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar skeleton */}
      <div className="hidden md:flex flex-col w-60 border-r border-border p-4 gap-6">
        <Bone className="h-8 w-28 rounded-md" />
        <div className="flex flex-col gap-3 mt-4">
          <Bone className="h-8 w-full rounded-lg" />
          <Bone className="h-8 w-full rounded-lg" />
          <Bone className="h-8 w-full rounded-lg" />
          <Bone className="h-8 w-full rounded-lg" />
        </div>
      </div>

      {/* Main content skeleton */}
      <div className="flex-1 p-4 md:px-8 md:py-4 max-w-[1400px] mx-auto">
        {/* Header */}
        <Bone className="h-6 w-48 rounded-md mb-1" />
        <Bone className="h-4 w-64 rounded-md mb-6" />

        {/* Stats row */}
        <div className="flex gap-4 mb-6 flex-wrap">
          <StatsCardSkeleton />
          <StatsCardSkeleton />
          <StatsCardSkeleton />
          <StatsCardSkeleton />
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
    </div>
  );
}

export {
  DashboardSkeleton,
  StatsCardSkeleton,
  AgentCardSkeleton,
  AuditRowSkeleton,
  ChartSkeleton,
};
