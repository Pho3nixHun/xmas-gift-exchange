import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Gift, Sparkles, Heart, Star } from 'lucide-react';
import { NamePickerData } from '../types';
import { createAnonymousBoxes, AnonymousBox } from '../utils/boxUtils';

interface GiftBoxSelectionProps {
  data: NamePickerData;
  currentUser: string;
  onSelectName: (selectedName: string) => void;
  loading: boolean;
  error: string | null;
}

const GiftBoxSelection: React.FC<GiftBoxSelectionProps> = ({
  data,
  currentUser,
  onSelectName,
  loading,
  error
}) => {
  const { t } = useTranslation();
  const [hoveredBox, setHoveredBox] = useState<string | null>(null);

  const availableNames = useMemo(() => {
    const names = data.names[currentUser] || [];
    console.log(
      'GiftBoxSelection - Available names for',
      currentUser,
      ':',
      names
    );
    console.log('GiftBoxSelection - All data.names:', data.names);
    return names;
  }, [data.names, currentUser]);
  const alreadyTaken = new Set(Object.keys(data.taken));

  const anonymousBoxes = useMemo(
    () => createAnonymousBoxes(availableNames),
    [availableNames]
  );

  const getBoxIcon = (iconType: string) => {
    const icons = { gift: Gift, heart: Heart, star: Star, sparkles: Sparkles };
    const IconComponent = icons[iconType as keyof typeof icons] || Gift;
    return <IconComponent size={24} />;
  };

  const handleBoxClick = (box: AnonymousBox) => {
    if (alreadyTaken.has(box.actualName) || loading) return;

    // Direct selection without confirmation
    onSelectName(box.actualName);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-red-800 to-purple-900 pt-24 pb-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            {t('selection.title')}
          </h1>
          <p className="text-xl text-white/80 mb-2">
            {t('selection.greeting', { name: currentUser })}
          </p>
          <p className="text-white/70">{t('selection.description')}</p>
        </motion.div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-8 bg-red-500/20 border border-red-500/50 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-red-200 text-center">{error}</p>
          </motion.div>
        )}

        {/* Gift Presents Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 mb-8">
          {anonymousBoxes.map((box, index) => {
            const isTaken = alreadyTaken.has(box.actualName);
            const isHovered = hoveredBox === box.id;

            return (
              <motion.div
                key={box.id}
                initial={{ opacity: 0, y: 50, rotateX: -15 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{
                  delay: index * 0.1,
                  duration: 0.8,
                  type: 'spring'
                }}
                className="relative perspective-1000">
                <motion.div
                  whileHover={
                    !isTaken
                      ? {
                          scale: 1.1,
                          rotateY: 15,
                          rotateX: -5,
                          z: 50
                        }
                      : {}
                  }
                  whileTap={
                    !isTaken
                      ? {
                          scale: 0.95,
                          rotateY: 0,
                          transition: { duration: 0.1 }
                        }
                      : {}
                  }
                  className={`
                    relative aspect-square cursor-pointer transition-all duration-300 transform-gpu
                    ${isTaken ? 'opacity-40 cursor-not-allowed' : ''}
                  `}
                  onClick={() => handleBoxClick(box)}
                  onHoverStart={() => !isTaken && setHoveredBox(box.id)}
                  onHoverEnd={() => setHoveredBox(null)}
                  style={{ transformStyle: 'preserve-3d' }}>
                  {/* Present Box */}
                  <div
                    className={`
                    absolute inset-0 rounded-lg shadow-2xl transform-gpu
                    ${
                      isTaken ? 'bg-gray-500' : `bg-gradient-to-br ${box.color}`
                    }
                    ${isHovered ? 'shadow-3xl' : ''}
                  `}>
                    {/* Horizontal Ribbon */}
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-3 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 shadow-lg">
                      <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent"></div>
                    </div>

                    {/* Vertical Ribbon */}
                    <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-3 bg-gradient-to-b from-yellow-400 via-yellow-300 to-yellow-400 shadow-lg">
                      <div className="absolute inset-0 bg-gradient-to-r from-white/30 to-transparent"></div>
                    </div>

                    {/* Bow on top */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                      <motion.div
                        animate={
                          isHovered && !isTaken
                            ? {
                                rotate: [0, -5, 5, -5, 0],
                                scale: [1, 1.2, 1]
                              }
                            : {}
                        }
                        transition={{ duration: 0.6 }}
                        className={`text-4xl ${isTaken ? 'grayscale' : ''}`}>
                        🎀
                      </motion.div>
                    </div>

                    {/* Gift Icon - smaller and positioned differently */}
                    <motion.div
                      animate={
                        isHovered && !isTaken
                          ? {
                              scale: [1, 1.1, 1],
                              rotate: [0, 10, -10, 0]
                            }
                          : {}
                      }
                      transition={{ duration: 0.8 }}
                      className={`absolute bottom-2 right-2 text-white/80 ${
                        isTaken ? 'text-gray-400' : ''
                      }`}>
                      {getBoxIcon(box.icon)}
                    </motion.div>

                    {/* Shine effect */}
                    {isHovered && !isTaken && (
                      <motion.div
                        initial={{ x: '-100%', opacity: 0 }}
                        animate={{ x: '100%', opacity: [0, 1, 0] }}
                        transition={{
                          duration: 0.8,
                          repeat: Infinity,
                          repeatDelay: 2
                        }}
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform rotate-12"
                      />
                    )}

                    {/* Opening animation hint */}
                    {isHovered && !isTaken && (
                      <motion.div
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="absolute inset-0 rounded-lg border-2 border-yellow-300 shadow-lg shadow-yellow-300/50"
                      />
                    )}
                  </div>

                  {/* Sparkle Effect */}
                  {isHovered && !isTaken && (
                    <div className="absolute inset-0 pointer-events-none">
                      {[...Array(8)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="absolute w-1 h-1 bg-yellow-200 rounded-full"
                          style={{
                            top: `${20 + Math.random() * 60}%`,
                            left: `${20 + Math.random() * 60}%`
                          }}
                          animate={{
                            scale: [0, 1, 0],
                            opacity: [0, 1, 0],
                            y: [0, -20, -40]
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            delay: i * 0.3
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Taken overlay */}
                  {isTaken && (
                    <div className="absolute inset-0 rounded-lg bg-black/50 flex items-center justify-center">
                      <div className="text-red-300 text-center">
                        <div className="text-xl mb-1">✗</div>
                        <div className="text-xs font-medium">
                          {t('selection.taken')}
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </motion.div>
            );
          })}
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-12 text-white/60">
          <p>
            {t('selection.stats', {
              available: availableNames.length - alreadyTaken.size,
              taken: alreadyTaken.size
            })}
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default GiftBoxSelection;
