import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Snowflake, Gift } from 'lucide-react';

interface LoadingScreenProps {
  onComplete: () => void;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ onComplete }) => {
  const { t } = useTranslation();
  const [currentFact, setCurrentFact] = useState(0);
  const [progress, setProgress] = useState(0);

  const facts = t('facts', { returnObjects: true }) as string[];

  useEffect(() => {
    const factInterval = setInterval(() => {
      setCurrentFact((prev) => (prev + 1) % facts.length);
    }, 2000);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          clearInterval(factInterval);
          setTimeout(onComplete, 500);
          return 100;
        }
        return prev + 2;
      });
    }, 100);

    return () => {
      clearInterval(factInterval);
      clearInterval(progressInterval);
    };
  }, [onComplete, facts.length]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-green-900 flex items-center justify-center relative overflow-hidden">
      {/* Animated Snowflakes */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-white opacity-60"
          initial={{ y: -100, x: Math.random() * window.innerWidth }}
          animate={{
            y: window.innerHeight + 100,
            x: Math.random() * window.innerWidth,
            rotate: 360
          }}
          transition={{
            duration: Math.random() * 10 + 5,
            repeat: Infinity,
            ease: 'linear'
          }}>
          <Snowflake size={Math.random() * 20 + 10} />
        </motion.div>
      ))}

      <div className="text-center z-10 max-w-2xl mx-auto px-8">
        {/* Main Title */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.8, type: 'spring' }}
          className="mb-8">
          <Gift size={80} className="mx-auto text-yellow-300 mb-4" />
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-2 font-serif">
            {t('loading.title')}
          </h1>
          <h2 className="text-3xl md:text-4xl font-light text-yellow-200">
            {t('loading.subtitle')}
          </h2>
        </motion.div>

        {/* Christmas Facts */}
        <motion.div
          key={currentFact}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5 }}
          className="mb-12">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-yellow-300 mb-3">
              {t('loading.fact', { number: currentFact + 1 })}
            </h3>
            <p className="text-white text-base leading-relaxed">
              {facts[currentFact]}
            </p>
          </div>
        </motion.div>

        {/* Progress Bar */}
        <div className="w-full max-w-md mx-auto">
          <div className="bg-white/20 rounded-full h-3 mb-4 overflow-hidden">
            <motion.div
              className="bg-gradient-to-r from-yellow-400 to-red-500 h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <p className="text-white/80 text-sm">
            {progress < 100
              ? t('loading.progress', { progress })
              : t('loading.complete')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
