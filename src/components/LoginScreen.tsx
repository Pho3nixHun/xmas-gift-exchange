import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { User, Lock, Eye, EyeOff, Snowflake } from 'lucide-react';
import { NamePickerData } from '../types';

interface LoginScreenProps {
  data: NamePickerData;
  onLogin: (username: string, password?: string) => void;
  loading: boolean;
  error: string | null;
}

const LoginScreen: React.FC<LoginScreenProps> = ({
  data,
  onLogin,
  loading,
  error
}) => {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);

  const availableUsers = Object.keys(data.names);
  const existingUser = availableUsers.includes(username);
  const hasPassword = data.passwords && data.passwords[username];

  useEffect(() => {
    if (username && existingUser && hasPassword) {
      setNeedsPassword(true);
      setIsNewUser(false);
    } else if (username && existingUser && !hasPassword) {
      setNeedsPassword(false);
      setIsNewUser(true);
    } else {
      setNeedsPassword(false);
      setIsNewUser(false);
    }
  }, [username, existingUser, hasPassword]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      onLogin(
        username.trim(),
        needsPassword || isNewUser ? password : undefined
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-red-900 flex items-center justify-center relative overflow-hidden pt-20">
      {/* Animated Background Elements */}
      {[...Array(15)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-white/20"
          initial={{
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            rotate: 0
          }}
          animate={{
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            rotate: 360
          }}
          transition={{
            duration: Math.random() * 20 + 10,
            repeat: Infinity,
            ease: 'linear'
          }}>
          <Snowflake size={Math.random() * 30 + 20} />
        </motion.div>
      ))}

      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="bg-white/10 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-white/20 max-w-md w-full mx-4">
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring' }}>
            <User size={60} className="mx-auto text-yellow-300 mb-4" />
          </motion.div>
          <h2 className="text-3xl font-bold text-white mb-2">
            {t('login.title')}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Username Input */}
          <div className="space-y-2">
            <label className="text-white font-medium block">
              {t('login.username_label')}
            </label>
            <div className="relative">
              <select
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all duration-200"
                required>
                <option value="" className="bg-gray-800">
                  {t('login.username_placeholder')}
                </option>
                {availableUsers.map((user) => (
                  <option key={user} value={user} className="bg-gray-800">
                    {user}{' '}
                    {data.passwords?.[user]
                      ? t('login.password_protected')
                      : ''}
                  </option>
                ))}
              </select>
              <User
                className="absolute right-3 top-3 text-white/60"
                size={20}
              />
            </div>
          </div>

          {/* Password Input */}
          {(needsPassword || isNewUser) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.3 }}
              className="space-y-2">
              <label className="text-white font-medium block">
                {isNewUser
                  ? t('login.password_create_label')
                  : t('login.password_enter_label')}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pl-12 pr-12 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all duration-200"
                  placeholder={
                    isNewUser
                      ? t('login.password_create_placeholder')
                      : t('login.password_enter_placeholder')
                  }
                  required
                />
                <Lock
                  className="absolute left-3 top-3 text-white/60"
                  size={20}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-white/60 hover:text-white transition-colors">
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {isNewUser && (
                <p className="text-yellow-300 text-sm">
                  {t('login.password_hint')}
                </p>
              )}
            </motion.div>
          )}

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
              <p className="text-red-200 text-sm">{error}</p>
            </motion.div>
          )}

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={loading || !username}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-gradient-to-r from-red-600 to-green-600 hover:from-red-700 hover:to-green-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg">
            {loading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>{t('login.loading')}</span>
              </div>
            ) : isNewUser ? (
              t('login.button_new')
            ) : (
              t('login.button_existing')
            )}
          </motion.button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-white/60 text-sm">
            {t('login.participants', { count: availableUsers.length })}
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginScreen;
