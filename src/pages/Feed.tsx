import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Heart, MessageSquare, LogOut } from "lucide-react";
import { toast } from "sonner";

interface Post {
  id: string;
  content: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
  profiles: {
    username: string;
    full_name: string;
    avatar_url: string;
  };
}

const Feed = () => {
  const navigate = useNavigate();
  const [newPost, setNewPost] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/");
      }
    };
    checkAuth();
  }, [navigate]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    
    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Star properties
    const stars: { x: number; y: number; radius: number; color: string; twinkleSpeed: number; twinklePhase: number }[] = [];
    const numStars = 100;
    const colors = ['#8B5CF6', '#D946EF', '#F97316', '#0EA5E9', '#1EAEDB', '#0FA0CE'];
    
    // Initialize stars
    for (let i = 0; i < numStars; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 2 + 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        twinkleSpeed: 0.03 + Math.random() * 0.05,
        twinklePhase: Math.random() * Math.PI * 2
      });
    }

    // Snow properties
    const snowflakes: { x: number; y: number; speed: number; size: number }[] = [];
    const numSnowflakes = 200;

    // Initialize snowflakes
    for (let i = 0; i < numSnowflakes; i++) {
      snowflakes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        speed: 1 + Math.random() * 2,
        size: Math.random() * 3 + 1
      });
    }

    // Animation loop
    let animationFrameId: number;
    const animate = () => {
      ctx.fillStyle = '#1A1F2C';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw and animate stars
      stars.forEach(star => {
        star.twinklePhase += star.twinkleSpeed;
        const glow = Math.abs(Math.sin(star.twinklePhase)) * 20;
        
        const gradient = ctx.createRadialGradient(
          star.x, star.y, 0,
          star.x, star.y, star.radius + glow
        );
        gradient.addColorStop(0, star.color);
        gradient.addColorStop(1, 'transparent');
        
        ctx.beginPath();
        ctx.fillStyle = gradient;
        ctx.arc(star.x, star.y, star.radius + glow, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw and animate snowflakes
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      snowflakes.forEach(flake => {
        flake.y += flake.speed;
        flake.x += Math.sin(flake.y * 0.01) * 0.5;

        if (flake.y > canvas.height) {
          flake.y = -5;
          flake.x = Math.random() * canvas.width;
        }

        ctx.beginPath();
        ctx.arc(flake.x, flake.y, flake.size, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const { data: posts, isLoading } = useQuery({
    queryKey: ['posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles (
            username,
            full_name,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Post[];
    },
  });

  const handleCreatePost = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('posts')
        .insert([
          { content: newPost, user_id: user.id }
        ]);

      if (error) throw error;
      
      setNewPost("");
      toast.success("Post created successfully!");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
    } else {
      navigate("/");
    }
  };

  return (
    <>
      <canvas ref={canvasRef} id="snow-canvas" />
      <div className="min-h-screen bg-transparent">
        <div className="container mx-auto max-w-3xl p-4">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-white">Feed</h1>
            <Button variant="ghost" onClick={handleSignOut} className="hover:bg-white/10">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>

          <Card className="mb-8 glass-morphism">
            <CardContent className="pt-6">
              <textarea
                className="w-full min-h-[100px] p-4 rounded-lg bg-white/5 border-white/10 resize-none focus:outline-none focus:ring-2 focus:ring-primary text-white placeholder-white/50"
                placeholder="What's on your mind?"
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
              />
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button onClick={handleCreatePost} disabled={!newPost.trim()} className="hover-scale">
                Post
              </Button>
            </CardFooter>
          </Card>

          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          ) : (
            <div className="space-y-4">
              {posts?.map((post) => (
                <Card key={post.id} className="glass-morphism hover-scale">
                  <CardHeader className="flex flex-row items-center space-x-4">
                    <Avatar>
                      <AvatarImage src={post.profiles.avatar_url} />
                      <AvatarFallback>
                        {post.profiles.username.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-white">{post.profiles.full_name}</p>
                      <p className="text-sm text-white/60">@{post.profiles.username}</p>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap text-white">{post.content}</p>
                  </CardContent>
                  <CardFooter className="flex gap-4">
                    <Button variant="ghost" size="sm" className="text-white/60 hover:text-white hover:bg-white/10">
                      <Heart className="h-4 w-4 mr-2" />
                      {post.likes_count}
                    </Button>
                    <Button variant="ghost" size="sm" className="text-white/60 hover:text-white hover:bg-white/10">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      {post.comments_count}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Feed;