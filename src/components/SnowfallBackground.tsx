import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface SnowflakeProps {
  id: number;
  size: number;
  x: number;
  duration: number;
  delay: number;
}

const Snowflake: React.FC<SnowflakeProps> = ({ id, size, x, duration, delay }) => {
  const snowflakeVariants = {
    initial: { y: -100, x, rotate: 0, opacity: 0 },
    animate: {
      y: window.innerHeight + 100,
      x: x + (Math.sin(id) * 50),
      rotate: 360,
      opacity: [0, 1, 1, 0],
    },
  };

  return (
    <motion.div
      className="fixed pointer-events-none z-10"
      style={{
        width: size,
        height: size,
      }}
      initial="initial"
      animate="animate"
      variants={snowflakeVariants}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "linear",
      }}
    >
      <div
        className="bg-white rounded-full opacity-80"
        style={{ width: '100%', height: '100%' }}
      />
    </motion.div>
  );
};

const SnowfallBackground: React.FC = () => {
  const snowflakes = useMemo(() => {
    return [...Array(50)].map((_, i) => ({
      id: i,
      size: Math.random() * 6 + 2,
      x: Math.random() * window.innerWidth,
      duration: Math.random() * 10 + 10,
      delay: Math.random() * 5,
    }));
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {snowflakes.map((flake) => (
        <Snowflake key={flake.id} {...flake} />
      ))}
    </div>
  );
};

export default SnowfallBackground;