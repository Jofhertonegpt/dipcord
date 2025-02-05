import { useLocation, Link } from "react-router-dom";
import { Home, Server, MessageSquare, LogOut, Settings, X } from "lucide-react";
import { Button } from "./ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { NotificationPopover } from "./notifications/NotificationPopover";

export const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
    } else {
      navigate("/");
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 w-full bg-background border-t border-white/10 z-50">
      <div className="flex items-center justify-around h-16 p-2 max-w-screen-xl mx-auto">
        <Link to="/">
          <Button
            variant="ghost"
            size="icon"
            className={`hover:scale-110 transition-transform ${
              isActive("/") ? "bg-white/10" : ""
            }`}
          >
            <Home className="h-5 w-5" />
          </Button>
        </Link>
        <Link to="/feed">
          <Button
            variant="ghost"
            size="icon"
            className={`hover:scale-110 transition-transform ${
              isActive("/feed") ? "bg-white/10" : ""
            }`}
          >
            <X className="h-5 w-5" />
          </Button>
        </Link>
        <Link to="/servers">
          <Button
            variant="ghost"
            size="icon"
            className={`hover:scale-110 transition-transform ${
              isActive("/servers") ? "bg-white/10" : ""
            }`}
          >
            <Server className="h-5 w-5" />
          </Button>
        </Link>
        <Link to="/messages">
          <Button
            variant="ghost"
            size="icon"
            className={`hover:scale-110 transition-transform ${
              isActive("/messages") ? "bg-white/10" : ""
            }`}
          >
            <MessageSquare className="h-5 w-5" />
          </Button>
        </Link>
        <NotificationPopover />
        <Link to="/settings">
          <Button
            variant="ghost"
            size="icon"
            className={`hover:scale-110 transition-transform ${
              isActive("/settings") ? "bg-white/10" : ""
            }`}
          >
            <Settings className="h-5 w-5" />
          </Button>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSignOut}
          className="hover:scale-110 transition-transform text-red-500 hover:text-red-600"
        >
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </nav>
  );
}