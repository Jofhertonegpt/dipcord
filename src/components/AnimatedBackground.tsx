import { motion } from "framer-motion";

const BackgroundImage = () => (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 1 }}
    className="absolute inset-0 -z-10"
  >
    <picture>
      <source
        media="(max-width: 768px)"
        srcSet="/lovable-uploads/1da6a61e-48ab-4e29-8985-25a73d9cf296.png"
      />
      <img
        src="/lovable-uploads/a51ed3d1-cea0-4481-bd89-2dc96f2557c3.png"
        alt="Background"
        className="object-cover w-full h-full"
        loading="eager"
      />
    </picture>
  </motion.div>
);

const AnimatedBackground = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <BackgroundImage />
    </div>
  );
};

export default AnimatedBackground;