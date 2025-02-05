import { memo } from "react";
import { ServerGrid } from "@/components/dashboard/ServerGrid";
import { NotificationPopover } from "@/components/notifications/NotificationPopover";

const DashboardPage = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Welcome Back</h1>
          <p className="text-muted-foreground">Discover and join new communities</p>
        </div>
        <div className="space-y-8">
          <ServerGrid />
        </div>
      </div>
    </div>
  );
};

export default memo(DashboardPage);