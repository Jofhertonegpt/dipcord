import { useEffect, memo } from "react";
import { ServerGrid } from "@/components/dashboard/ServerGrid";
import { NotificationPopover } from "@/components/notifications/NotificationPopover";

const DashboardPage = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <NotificationPopover />
      </div>
      <div className="space-y-8">
        <ServerGrid />
      </div>
    </div>
  );
};

export default memo(DashboardPage);