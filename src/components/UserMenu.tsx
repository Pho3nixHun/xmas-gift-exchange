import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { User, RefreshCw, LogOut } from 'lucide-react';

interface UserMenuProps {
  currentUser: string;
  onRefresh: () => void;
  onLogout: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({
  currentUser,
  onRefresh,
  onLogout
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 bg-white/10 backdrop-blur-md rounded-xl px-4 py-2 border border-white/20 text-white hover:bg-white/20 transition-all duration-200">
        <User size={18} />
        <span className="font-medium">{currentUser}</span>
      </motion.button>

      {/* User Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-full right-0 mt-2 z-50">
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden shadow-2xl min-w-[160px]">
              <button
                onClick={() => {
                  onRefresh();
                  setIsOpen(false);
                }}
                className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-white/10 transition-colors text-white">
                <RefreshCw size={16} />
                <span>{t('wishes.refresh')}</span>
              </button>
              <div className="border-t border-white/10" />
              <button
                onClick={() => {
                  onLogout();
                  setIsOpen(false);
                }}
                className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-red-500/20 transition-colors text-red-300">
                <LogOut size={16} />
                <span>{t('wishes.logout')}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserMenu;
