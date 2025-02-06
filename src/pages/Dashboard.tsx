import { memo } from "react";
import { motion } from "framer-motion";
import { ServerGrid } from "@/components/dashboard/ServerGrid";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

const DashboardPage = () => {
  return (
    <motion.div 
      initial="hidden"
      animate="show"
      variants={container}
      className="min-h-screen bg-gradient-to-b from-background to-background/80"
    >
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-5xl mx-auto space-y-8">
          <motion.div variants={item} className="space-y-2">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground">
              Welcome Back
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Discover and join new communities
            </p>
          </motion.div>
          <motion.div variants={item}>
            <ServerGrid />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default memo(DashboardPage);