import { useLocation, Link } from "react-router-dom";
import { Home, Server, MessageSquare, LogOut, Settings, X } from "lucide-react";
import { Button } from "./ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { motion } from "framer-motion";

const navItems = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/feed", icon: X, label: "Feed" },
  { path: "/servers", icon: Server, label: "Servers" },
  { path: "/messages", icon: MessageSquare, label: "Messages" },
  { path: "/settings", icon: Settings, label: "Settings" },
];

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
    <motion.nav 
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-0 left-0 w-full bg-background/80 backdrop-blur-lg border-t border-border z-50"
    >
      <div className="flex items-center justify-around h-16 p-2 max-w-screen-xl mx-auto">
        {navItems.map((item) => (
          <Link key={item.path} to={item.path}>
            <Button
              variant="ghost"
              size="icon"
              className={`relative hover:scale-110 transition-transform ${
                isActive(item.path) ? "after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-primary" : ""
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="sr-only">{item.label}</span>
            </Button>
          </Link>
        ))}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSignOut}
          className="hover:scale-110 transition-transform text-destructive hover:text-destructive/80"
        >
          <LogOut className="h-5 w-5" />
          <span className="sr-only">Sign out</span>
        </Button>
      </div>
    </motion.nav>
  );
};