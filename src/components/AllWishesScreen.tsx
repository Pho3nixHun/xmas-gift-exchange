import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Gift, Users, ShoppingCart, Check, X } from 'lucide-react';
import { NamePickerData } from '../types';
import { WishItemWithMetadata, WishList, URLMetadata } from '../types/wishItem';
import WishItem from './WishItem';

interface AllWishesScreenProps {
  data: NamePickerData;
  currentUser: string;
  onUpdateWishes: (userName: string, wishes: WishList) => void;
  error: string | null;
}

const AllWishesScreen: React.FC<AllWishesScreenProps> = ({
  data,
  currentUser,
  onUpdateWishes,
  error
}) => {
  const { t } = useTranslation();
  const [allWishLists, setAllWishLists] = useState<Record<string, WishList>>({});
  const [selectedUser, setSelectedUser] = useState<string>('');

  const convertLegacyWishes = (legacyText: string): WishItemWithMetadata[] => {
    if (!legacyText.trim()) return [];
    
    const wishLines = legacyText
      .split(/\n\s*[•·*-]\s*/)
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    return wishLines.map((wishText, index) => {
      const urlMatch = wishText.match(/🔗\s*(https?:\/\/[^\s]+)/);
      let description = wishText;
      let url: string | undefined;
      
      if (urlMatch) {
        url = urlMatch[1];
        description = wishText.replace(/🔗\s*https?:\/\/[^\s]+/, '').trim();
      } else {
        const plainUrlMatch = wishText.match(/(https?:\/\/[^\s]+)/);
        if (plainUrlMatch) {
          url = plainUrlMatch[1];
          description = wishText.replace(plainUrlMatch[1], '').trim();
        }
      }
      
      return {
        id: `legacy-${index}-${Date.now()}`,
        description: description || wishText,
        url,
        priority: 'medium' as const,
        createdAt: Date.now() - (wishLines.length - index) * 1000,
        updatedAt: Date.now(),
      };
    });
  };

  useEffect(() => {
    const wishLists: Record<string, WishList> = {};
    
    // Get all users who have data (excluding current user)
    const allUsers = Object.keys(data.names).filter(user => user !== currentUser);
    
    for (const user of allUsers) {
      const userWishList = data.wishLists?.[user] || [];
      if (userWishList.length === 0 && data.gifts?.[user]) {
        // Convert legacy wishes
        wishLists[user] = convertLegacyWishes(data.gifts[user]);
      } else {
        wishLists[user] = userWishList;
      }
    }
    
    setAllWishLists(wishLists);
    if (allUsers.length > 0 && !selectedUser) {
      setSelectedUser(allUsers[0]);
    }
  }, [data.wishLists, data.gifts, data.names, selectedUser, currentUser]);

  const handlePurchaseToggle = useCallback(async (userName: string, itemId: string) => {
    setAllWishLists(prevLists => {
      const updatedLists = { ...prevLists };
      const userList = updatedLists[userName] || [];
      
      const newList = userList.map(item => {
        if (item.id === itemId) {
          if (item.purchasedBy) {
            // Mark as not purchased
            return {
              ...item,
              purchasedBy: undefined,
              purchaseDate: undefined
            };
          } else {
            // Mark as purchased
            return {
              ...item,
              purchasedBy: currentUser,
              purchaseDate: Date.now()
            };
          }
        }
        return item;
      });

      updatedLists[userName] = newList;

      // Save structured data directly (async)
      setTimeout(() => {
        onUpdateWishes(userName, newList);
      }, 0);
      
      return updatedLists;
    });
  }, [currentUser, onUpdateWishes]);

  const handleMetadataUpdate = useCallback((id: string, metadata: URLMetadata, error?: string) => {
    if (!selectedUser) return;
    
    setAllWishLists(prevLists => ({
      ...prevLists,
      [selectedUser]: prevLists[selectedUser]?.map(item => 
        item.id === id 
          ? { ...item, metadata, metadataError: error, metadataLoading: false }
          : item
      ) || []
    }));
  }, [selectedUser]);

  const allUsers = Object.keys(data.names).filter(user => user !== currentUser);
  const selectedUserWishes = allWishLists[selectedUser] || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-800 to-pink-900 pt-24 pb-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 flex items-center justify-center">
            <Users className="mr-4 text-blue-400" size={48} />
            {t('allWishes.title')}
          </h1>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 max-w-2xl mx-auto">
            <p className="text-xl text-white mb-2">
              {t('allWishes.subtitle')}
            </p>
            <p className="text-white/80">
              {t('allWishes.description')}
            </p>
          </div>
        </motion.div>

        {/* User Selection */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20 mb-8"
        >
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
            <Gift className="mr-3 text-green-400" size={28} />
            {t('allWishes.selectUser')}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {allUsers.map((user) => (
              <button
                key={user}
                onClick={() => setSelectedUser(user)}
                className={`p-3 rounded-xl transition-all duration-200 border ${
                  selectedUser === user
                    ? 'bg-blue-600 border-blue-400 text-white'
                    : 'bg-white/10 border-white/20 text-white/80 hover:bg-white/20'
                }`}
              >
                <div className="font-medium truncate">{user}</div>
                <div className="text-xs mt-1 opacity-60">
                  {allWishLists[user]?.length || 0} {t('allWishes.wishes')}
                </div>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Selected User's Wishes */}
        {selectedUser && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <ShoppingCart className="mr-3 text-purple-400" size={28} />
                {t('allWishes.userWishes', { name: selectedUser })}
              </h2>
            </div>

            {selectedUserWishes.length > 0 ? (
              <div className="space-y-4">
                {selectedUserWishes.map((item) => (
                  <div key={item.id} className="relative">
                    <div className={`${item.purchasedBy ? 'opacity-60' : ''} transition-opacity`}>
                      <WishItem
                        item={item}
                        onEdit={() => {}} // Read-only for other users
                        onDelete={() => {}} // Read-only for other users
                        onMetadataUpdate={handleMetadataUpdate}
                        readOnly={true}
                      />
                    </div>
                    
                    {/* Purchase Status Overlay */}
                    {selectedUser !== currentUser && (
                      <div className="absolute top-4 right-4 flex items-center space-x-2">
                        {item.purchasedBy ? (
                          <div className="flex items-center space-x-2">
                            <span className="bg-green-600 text-white px-3 py-1 rounded-full text-sm flex items-center">
                              <Check size={14} className="mr-1" />
                              {t('allWishes.purchasedBy', { name: item.purchasedBy })}
                            </span>
                            {item.purchasedBy === currentUser && (
                              <button
                                onClick={() => handlePurchaseToggle(selectedUser, item.id)}
                                className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg transition-colors"
                                title={t('allWishes.markNotPurchased')}
                              >
                                <X size={16} />
                              </button>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => handlePurchaseToggle(selectedUser, item.id)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2"
                          >
                            <ShoppingCart size={16} />
                            <span>{t('allWishes.markPurchased')}</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Gift className="mx-auto text-white/40 mb-4" size={64} />
                <p className="text-white/60 text-lg">
                  {t('allWishes.noWishes', { name: selectedUser })}
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-8 bg-red-500/20 border border-red-500/50 rounded-lg p-4 max-w-2xl mx-auto"
          >
            <p className="text-red-200 text-center">{error}</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default AllWishesScreen;