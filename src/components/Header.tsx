import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Gift, Users } from 'lucide-react';
import LanguageSwitcher from './LanguageSwitcher';
import UserMenu from './UserMenu';

interface HeaderProps {
  currentUser?: string;
  onRefresh?: () => void;
  onLogout?: () => void;
  showUserMenu?: boolean;
  currentStep?: string;
  onNavigate?: (step: 'wishes' | 'all-wishes') => void;
}

const Header: React.FC<HeaderProps> = ({
  currentUser,
  onRefresh,
  onLogout,
  showUserMenu = false,
  currentStep,
  onNavigate
}) => {
  const { t } = useTranslation();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/20 backdrop-blur-sm border-b border-white/10">
      <div className="flex justify-between items-center px-6 py-4">
        {/* Left side - Navigation buttons when in wishes screens */}
        <div className="flex items-center space-x-3">
          {showUserMenu &&
            onNavigate &&
            (currentStep === 'wishes' || currentStep === 'all-wishes') && (
              <>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onNavigate('wishes')}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                    currentStep === 'wishes'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white/10 text-white/80 hover:bg-white/20'
                  }`}>
                  <Gift size={16} />
                  <span className="hidden sm:inline">
                    {t('navigation.myWishes')}
                  </span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onNavigate('all-wishes')}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                    currentStep === 'all-wishes'
                      ? 'bg-purple-600 text-white'
                      : 'bg-white/10 text-white/80 hover:bg-white/20'
                  }`}>
                  <Users size={16} />
                  <span className="hidden sm:inline">
                    {t('navigation.allWishes')}
                  </span>
                </motion.button>
              </>
            )}
        </div>

        {/* Right side - Language switcher and User menu */}
        <div className="flex items-center space-x-4">
          <LanguageSwitcher />
          {showUserMenu && currentUser && onRefresh && onLogout && (
            <UserMenu
              currentUser={currentUser}
              onRefresh={onRefresh}
              onLogout={onLogout}
            />
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
