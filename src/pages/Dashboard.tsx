import { useEffect, memo } from "react";
import { ServerGrid } from "@/components/dashboard/ServerGrid";

const DashboardPage = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Welcome to Your Dashboard</h1>
      <div className="space-y-8">
        <ServerGrid />
      </div>
    </div>
  );
};

export default memo(DashboardPage);