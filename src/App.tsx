import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LoadingScreen from './components/LoadingScreen';
import LoginScreen from './components/LoginScreen';
import GiftBoxSelection from './components/GiftBoxSelection';
import WishesScreen from './components/WishesScreen';
import AllWishesScreen from './components/AllWishesScreen';
import SnowfallBackground from './components/SnowfallBackground';
import Header from './components/Header';
import { AdminPanel } from './components/AdminPanel';
import { AppState, NamePickerData } from './types';
import { WishList } from './types/wishItem';
import { ApiService } from './services/api';
import { LocalStorageService } from './utils/localStorage';

function App() {
  const [state, setState] = useState<AppState>({
    currentUser: null,
    selectedName: null,
    currentStep: 'loading',
    data: null,
    loading: false,
    error: null
  });

  const [showAdminPanel, setShowAdminPanel] = useState(false);

  const updateState = (updates: Partial<AppState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  const getSelectedNameForUser = (
    username: string,
    data: NamePickerData
  ): string | null => {
    // Find the name that this user has selected (look in data.taken)
    const selectedEntry = Object.entries(data.taken).find(
      ([, user]) => user === username
    );
    return selectedEntry ? selectedEntry[0] : null;
  };

  useEffect(() => {
    // Check for admin query parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('admin') === 'true') {
      setShowAdminPanel(true);
    }

    const initializeApp = async () => {
      try {
        updateState({ loading: true, error: null });

        const data = await ApiService.fetchData();
        const savedUser = LocalStorageService.getUser();

        updateState({
          data,
          loading: false
        });

        // Only auto-login if we have username saved and stored password hash exists
        if (
          savedUser &&
          data.names[savedUser] &&
          LocalStorageService.getPasswordHash()
        ) {
          // For auto-login, we'll just check if the user exists and has a stored hash
          // The password will be verified when they actually try to login next time
          const selectedName = getSelectedNameForUser(savedUser, data);

          updateState({
            currentUser: savedUser,
            selectedName: selectedName
          });

          if (selectedName) {
            updateState({ currentStep: 'wishes' });
          } else {
            updateState({ currentStep: 'selection' });
          }
        } else {
          // No saved credentials or user doesn't exist, require login
          updateState({ currentStep: 'login' });
        }
      } catch (error) {
        updateState({
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load data',
          currentStep: 'login'
        });
      }
    };

    const timer = setTimeout(() => {
      initializeApp();
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleLogin = async (username: string, password?: string) => {
    try {
      updateState({ loading: true, error: null });

      const data = await ApiService.fetchData();

      if (!data.names[username]) {
        throw new Error('User not found in the system');
      }

      const hasPassword = data.passwords?.[username];

      if (hasPassword) {
        const passwordMatches = await ApiService.verifyPassword(
          username,
          password || ''
        );
        if (!passwordMatches) {
          throw new Error('Incorrect password');
        }
      }

      if (!hasPassword && password) {
        await ApiService.setPassword(username, password);
      }

      LocalStorageService.saveUser(username);

      // Save hashed password for future auto-login (only if password was provided)
      if (password) {
        await LocalStorageService.savePassword(password);
      }

      const selectedName = getSelectedNameForUser(username, data);

      if (selectedName) {
        updateState({
          currentUser: username,
          selectedName,
          currentStep: 'wishes',
          loading: false
        });
      } else {
        updateState({
          currentUser: username,
          selectedName: null,
          currentStep: 'selection',
          loading: false
        });
      }
    } catch (error) {
      updateState({
        loading: false,
        error: error instanceof Error ? error.message : 'Login failed'
      });
    }
  };

  const handleSelectName = async (selectedName: string) => {
    if (!state.currentUser) return;

    try {
      updateState({ loading: true, error: null });

      const updatedData = await ApiService.pickName(
        state.currentUser,
        selectedName
      );

      // Get the selected name from the updated server data
      const confirmedSelectedName = getSelectedNameForUser(
        state.currentUser,
        updatedData
      );

      updateState({
        data: updatedData,
        selectedName: confirmedSelectedName,
        currentStep: 'wishes',
        loading: false
      });
    } catch (error) {
      updateState({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to select name'
      });
    }
  };

  const handleSaveWishes = async (wishes: WishList) => {
    if (!state.currentUser) return;

    try {
      updateState({ loading: true, error: null });

      const updatedData = await ApiService.setWishList(
        state.currentUser,
        wishes
      );

      updateState({
        data: updatedData,
        loading: false
      });
    } catch (error) {
      updateState({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to save wishes'
      });
    }
  };

  const handleLogout = () => {
    LocalStorageService.clearAll();
    updateState({
      currentUser: null,
      selectedName: null,
      currentStep: 'loading',
      error: null
    });
    window.location.reload();
  };

  const handleNavigate = (step: 'wishes' | 'all-wishes') => {
    updateState({ currentStep: step });
  };

  const handleUpdateWishes = async (userName: string, wishes: WishList) => {
    if (!state.currentUser) return;

    try {
      updateState({ loading: true, error: null });

      const updatedData = await ApiService.setWishList(userName, wishes);

      updateState({
        data: updatedData,
        loading: false
      });
    } catch (error) {
      updateState({
        loading: false,
        error:
          error instanceof Error ? error.message : 'Failed to update wishes'
      });
    }
  };

  const handleLoadingComplete = () => {
    updateState({ currentStep: 'login' });
  };

  return (
    <div className="relative">
      <SnowfallBackground />
      <Header
        currentUser={state.currentUser || undefined}
        onRefresh={() => window.location.reload()}
        onLogout={handleLogout}
        showUserMenu={
          state.currentStep === 'selection' ||
          state.currentStep === 'wishes' ||
          state.currentStep === 'all-wishes'
        }
        currentStep={state.currentStep}
        onNavigate={handleNavigate}
      />

      <AnimatePresence mode="wait">
        {state.currentStep === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}>
            <LoadingScreen onComplete={handleLoadingComplete} />
          </motion.div>
        )}

        {state.currentStep === 'login' && state.data && (
          <motion.div
            key="login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}>
            <LoginScreen
              data={state.data}
              onLogin={handleLogin}
              loading={state.loading}
              error={state.error}
            />
          </motion.div>
        )}

        {state.currentStep === 'selection' &&
          state.data &&
          state.currentUser && (
            <motion.div
              key="selection"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.5 }}>
              <GiftBoxSelection
                data={state.data}
                currentUser={state.currentUser}
                onSelectName={handleSelectName}
                loading={state.loading}
                error={state.error}
              />
            </motion.div>
          )}

        {state.currentStep === 'wishes' &&
          state.data &&
          state.currentUser &&
          state.selectedName && (
            <motion.div
              key="wishes"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              transition={{ duration: 0.5 }}>
              <WishesScreen
                data={state.data}
                currentUser={state.currentUser}
                selectedName={state.selectedName}
                onSaveWishes={handleSaveWishes}
                onUpdateWishes={handleUpdateWishes}
                onLogout={handleLogout}
                error={state.error}
              />
            </motion.div>
          )}

        {state.currentStep === 'all-wishes' &&
          state.data &&
          state.currentUser && (
            <motion.div
              key="all-wishes"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              transition={{ duration: 0.5 }}>
              <AllWishesScreen
                data={state.data}
                currentUser={state.currentUser}
                onUpdateWishes={handleUpdateWishes}
                error={state.error}
              />
            </motion.div>
          )}
      </AnimatePresence>

      {/* Admin Panel */}
      <AnimatePresence>
        {showAdminPanel && (
          <AdminPanel onClose={() => setShowAdminPanel(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
