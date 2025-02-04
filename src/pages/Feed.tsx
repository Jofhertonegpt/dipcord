import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const Feed = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/");
      }
    };
    checkAuth();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background p-4">
      <h1 className="text-2xl font-bold">Feed</h1>
      {/* We'll implement the feed content in the next step */}
    </div>
  );
};

export default Feed;