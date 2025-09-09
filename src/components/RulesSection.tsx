import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, ChevronDown } from 'lucide-react';
import { LocalStorageService } from '../utils/localStorage';

export const RulesSection: React.FC = () => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(
    !LocalStorageService.getRulesClosed()
  );

  // Save the expanded state to localStorage when it changes
  const toggleExpanded = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    LocalStorageService.saveRulesClosed(!newState);
  };

  const avoidItems = t('rules.avoid_items', {
    returnObjects: true
  }) as string[];
  const considerItems = t('rules.consider_items', {
    returnObjects: true
  }) as string[];
  const tips = t('rules.tips', { returnObjects: true }) as string[];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.6 }}
      className="mb-8 max-w-4xl mx-auto">
      {/* Collapsible Header */}
      <motion.button
        onClick={toggleExpanded}
        className="w-full bg-gradient-to-r from-red-600/20 to-green-600/20 backdrop-blur-sm 
                   border border-white/20 rounded-lg p-4 mb-4 text-left
                   hover:from-red-600/30 hover:to-green-600/30 transition-all duration-300"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-white" />
            <div>
              <h3 className="text-xl font-bold text-white mb-1">
                {t('rules.title')}
              </h3>
              <p className="text-white/80 text-sm">{t('rules.subtitle')}</p>
            </div>
          </div>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.3 }}>
            <ChevronDown className="w-6 h-6 text-white" />
          </motion.div>
        </div>
      </motion.button>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="overflow-hidden">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-6 space-y-6">
              {/* Main Rule */}
              <div className="text-center">
                <p className="text-lg font-medium text-white mb-4">
                  {t('rules.main_rule')}
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Avoid Section */}
                <div className="bg-red-500/20 rounded-lg p-4">
                  <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                    {t('rules.avoid_title')}
                  </h4>
                  <ul className="space-y-2 text-sm text-white/90">
                    {avoidItems.map((item, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * i }}
                        className="flex items-start gap-2">
                        <span className="text-red-300 mt-0.5">•</span>
                        <span>{item}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>

                {/* Consider Section */}
                <div className="bg-green-500/20 rounded-lg p-4">
                  <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                    {t('rules.consider_title')}
                  </h4>
                  <ul className="space-y-2 text-sm text-white/90">
                    {considerItems.map((item, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * i }}
                        className="flex items-start gap-2">
                        <span className="text-green-300 mt-0.5">•</span>
                        <span>{item}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Budget Guidelines */}
              <div className="bg-yellow-500/20 rounded-lg p-4">
                <h4 className="font-semibold text-white mb-3">
                  {t('rules.budget_title')}
                </h4>
                <p className="text-white/90 text-sm mb-2">
                  <strong>{t('rules.budget_range')}</strong>
                </p>
                <p className="text-white/80 text-sm italic">
                  {t('rules.budget_note')}
                </p>
              </div>

              {/* Pro Tips */}
              <div className="bg-blue-500/20 rounded-lg p-4">
                <h4 className="font-semibold text-white mb-3">
                  {t('rules.tip_title')}
                </h4>
                <ul className="space-y-2 text-sm text-white/90">
                  {tips.map((tip, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * i }}
                      className="flex items-start gap-2">
                      <span className="text-blue-300 mt-0.5">•</span>
                      <span>{tip}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>

              {/* Remember */}
              <div className="text-center pt-4 border-t border-white/20">
                <p className="text-white font-medium italic">
                  {t('rules.remember')}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
