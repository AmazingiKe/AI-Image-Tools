import React from 'react';
import { motion } from 'framer-motion';
import {
  Ghost,
  Cat,
  Dog,
  Coffee,
  Pizza,
  Rocket,
  Gamepad2,
  Music,
  Smile,
  Zap,
  Star,
  Heart,
  Moon,
  Sun,
  Camera,
  Sparkles,
  Cookie,
  PartyPopper
} from 'lucide-react';

const icons = [
  Ghost, Cat, Dog, Coffee, Pizza, Rocket,
  Gamepad2, Music, Smile, Zap, Star, Heart,
  Moon, Sun, Camera, Sparkles, Cookie, PartyPopper
];

export const IdleAnimation: React.FC = () => {
  // Generate items with radial positioning
  const radialItems = Array.from({ length: 28 }).map((_, i) => {
    const angle = (i / 28) * Math.PI * 2;
    const distance = 120 + Math.random() * 160; // Spread out from center
    return {
      Icon: icons[i % icons.length],
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      delay: Math.random() * 2,
      duration: 3 + Math.random() * 2,
    };
  });

  return (
    <div className="relative w-full h-[400px] flex items-center justify-center select-none pointer-events-none">
      {/* Background Ambient Glow */}
      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute w-[500px] h-[500px] bg-gradient-to-tr from-indigo-500/20 via-cyan-400/10 to-purple-500/20 rounded-full blur-[120px]"
      />

      {/* Radiating Icons */}
      <div className="absolute inset-0 flex items-center justify-center">
        {radialItems.map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
            animate={{
              opacity: [0, 0.4, 0],
              scale: [0.5, 1, 0.5],
              x: [0, item.x],
              y: [0, item.y],
            }}
            transition={{
              duration: item.duration,
              repeat: Infinity,
              delay: item.delay,
              ease: "easeOut"
            }}
            className="absolute"
          >
            <item.Icon className="w-6 h-6 text-gray-400/60 dark:text-gray-500/60" strokeWidth={1.2} />
          </motion.div>
        ))}
      </div>

      {/* Floating Center Core */}
      <motion.div
        animate={{
          y: [-15, 15, -15],
          rotate: [0, 10, -10, 0],
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="relative z-20 w-32 h-32 bg-white/40 dark:bg-white/5 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] flex items-center justify-center border border-white/40 dark:border-white/10"
      >
        <motion.div
          animate={{
            filter: ["drop-shadow(0 0 0px rgba(99,102,241,0))", "drop-shadow(0 0 15px rgba(99,102,241,0.5))", "drop-shadow(0 0 0px rgba(99,102,241,0))"]
          }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <Rocket className="w-12 h-12 text-black dark:text-white" />
        </motion.div>
      </motion.div>
    </div>
  );
};
