import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { ProfileView } from "@/components/profile/ProfileView";

interface UserContextMenuProps {
  userId: string;
  children: React.ReactNode;
}

export const UserContextMenu = ({ userId, children }: UserContextMenuProps) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger>
          {children}
        </ContextMenuTrigger>
        <ContextMenuContent className="bg-[#403E43] border-[#33C3F0]/20 text-white">
          <ContextMenuItem 
            className="hover:bg-[#33C3F0]/10 focus:bg-[#33C3F0]/10 cursor-pointer"
            onClick={() => setIsProfileOpen(true)}
          >
            View Profile
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent>
          <DialogTitle>User Profile</DialogTitle>
          <ProfileView userId={userId} />
        </DialogContent>
      </Dialog>
    </>
  );
};