import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Heart,
  Gift,
  Plus,
  Sparkles,
  ShoppingCart,
  Check,
  X
} from 'lucide-react';
import { NamePickerData } from '../types';
import { WishItemWithMetadata, WishList, URLMetadata } from '../types/wishItem';
import WishItem from './WishItem';
import WishForm from './WishForm';
import { RulesSection } from './RulesSection';

interface WishesScreenProps {
  data: NamePickerData;
  currentUser: string;
  selectedName: string;
  onSaveWishes: (wishes: WishList) => void;
  onUpdateWishes: (userName: string, wishes: WishList) => void;
  onLogout: () => void;
  error: string | null;
}

const WishesScreen: React.FC<WishesScreenProps> = ({
  data,
  currentUser,
  selectedName,
  onSaveWishes,
  onUpdateWishes,
  onLogout,
  error
}) => {
  const { t } = useTranslation();
  const [wishList, setWishList] = useState<WishList>([]);
  const [recipientWishList, setRecipientWishList] = useState<WishList>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<
    WishItemWithMetadata | undefined
  >();

  useEffect(() => {
    // Load user's wishlist from structured data or convert from legacy format
    const userWishList = data.wishLists?.[currentUser] || [];
    setWishList(userWishList);

    // Load recipient's wishlist
    const recipientWishes = data.wishLists?.[selectedName] || [];
    setRecipientWishList(recipientWishes);
  }, [data.wishLists, data.gifts, currentUser, selectedName]);

  const handleSaveWish = async (
    wishData: Omit<WishItemWithMetadata, 'id' | 'createdAt' | 'updatedAt'> & {
      id?: string;
    }
  ) => {
    const now = Date.now();
    let updatedWishList: WishList;

    if (wishData.id) {
      // Edit existing wish
      updatedWishList = wishList.map((item) =>
        item.id === wishData.id
          ? ({
              ...wishData,
              id: wishData.id,
              createdAt: item.createdAt,
              updatedAt: now
            } as WishItemWithMetadata)
          : item
      );
    } else {
      // Add new wish
      const newWish: WishItemWithMetadata = {
        ...wishData,
        id: now.toString(),
        createdAt: now,
        updatedAt: now
      };
      updatedWishList = [...wishList, newWish];
    }

    setWishList(updatedWishList);
    setIsFormOpen(false);
    setEditingItem(undefined);

    // Save directly as structured data
    onSaveWishes(updatedWishList);
  };

  const handleDeleteWish = (id: string) => {
    const updatedWishList = wishList.filter((item) => item.id !== id);
    setWishList(updatedWishList);

    // Save directly as structured data
    onSaveWishes(updatedWishList);
  };

  const handleEditWish = (item: WishItemWithMetadata) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };

  const handlePurchaseToggle = useCallback(
    async (userName: string, itemId: string) => {
      setRecipientWishList((prevList) => {
        const newList = prevList.map((item) => {
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

        // Save changes (async)
        setTimeout(() => {
          onUpdateWishes(userName, newList);
        }, 0);

        return newList;
      });
    },
    [currentUser, onUpdateWishes]
  );

  const handleMetadataUpdate = useCallback(
    (id: string, metadata: URLMetadata, error?: string) => {
      setWishList((prevList) =>
        prevList.map((item) =>
          item.id === id
            ? {
                ...item,
                metadata,
                metadataError: error,
                metadataLoading: false
              }
            : item
        )
      );

      setRecipientWishList((prevList) =>
        prevList.map((item) =>
          item.id === id
            ? {
                ...item,
                metadata,
                metadataError: error,
                metadataLoading: false
              }
            : item
        )
      );
    },
    []
  );

  return (
    <>
      <WishForm
        item={editingItem}
        isOpen={isFormOpen}
        onSave={handleSaveWish}
        onCancel={() => {
          setIsFormOpen(false);
          setEditingItem(undefined);
        }}
      />
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-800 to-green-900 pt-24 pb-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              {t('wishes.title')}
            </h1>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 max-w-2xl mx-auto">
              <p className="text-xl text-white mb-2">
                {t('wishes.greeting', { name: currentUser })}
              </p>
              <p className="text-white/80">
                {t('wishes.giving_to', { recipient: selectedName })}
              </p>
            </div>
          </motion.div>

          {/* Rules Section */}
          <RulesSection />

          {/* Recipient's Wishes Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 mb-8">
            <h2 className="text-2xl font-bold text-white flex items-center mb-6">
              <Gift className="mr-3 text-green-400" size={28} />
              {t('wishes.recipient_wishes_title', { name: selectedName })}
            </h2>

            {recipientWishList.length > 0 ? (
              <div className="space-y-4">
                {recipientWishList.map((item) => (
                  <div key={item.id} className="relative">
                    <div
                      className={`${
                        item.purchasedBy ? 'opacity-60' : ''
                      } transition-opacity`}>
                      <WishItem
                        item={item}
                        onEdit={() => {}} // Read-only for recipient's wishes
                        onDelete={() => {}} // Read-only for recipient's wishes
                        onMetadataUpdate={handleMetadataUpdate}
                        readOnly={true}
                      />
                    </div>

                    {/* Purchase Status Overlay */}
                    <div className="absolute top-4 right-4 flex items-center space-x-2">
                      {item.purchasedBy ? (
                        <div className="flex items-center space-x-2">
                          <span className="bg-green-600 text-white px-3 py-1 rounded-full text-sm flex items-center">
                            <Check size={14} className="mr-1" />
                            {t('allWishes.purchasedBy', {
                              name: item.purchasedBy
                            })}
                          </span>
                          {item.purchasedBy === currentUser && (
                            <button
                              onClick={() =>
                                handlePurchaseToggle(selectedName, item.id)
                              }
                              className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg transition-colors"
                              title={t('allWishes.markNotPurchased')}>
                              <X size={16} />
                            </button>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() =>
                            handlePurchaseToggle(selectedName, item.id)
                          }
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2">
                          <ShoppingCart size={16} />
                          <span>{t('allWishes.markPurchased')}</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Sparkles className="mx-auto text-white/40 mb-4" size={48} />
                <p className="text-white/60 text-lg mb-2">
                  {t('wishList.recipient_no_wishes', { name: selectedName })}
                </p>
                <p className="text-white/50 text-sm">
                  {t('wishes.recipient_no_wishes_hint')}
                </p>
              </div>
            )}
          </motion.div>

          {/* Wishes Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <Heart className="mr-3 text-red-400" size={28} />
                {t('wishList.title')}
              </h2>
              <button
                onClick={() => setIsFormOpen(true)}
                className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white px-4 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2">
                <Plus size={16} />
                <span>{t('wishList.add_wish')}</span>
              </button>
            </div>

            {wishList.length > 0 ? (
              <div className="space-y-4">
                {wishList.map((item) => (
                  <WishItem
                    key={item.id}
                    item={item}
                    onEdit={handleEditWish}
                    onDelete={handleDeleteWish}
                    onMetadataUpdate={handleMetadataUpdate}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Gift className="mx-auto text-white/40 mb-4" size={48} />
                <p className="text-white/60 text-lg mb-2">
                  {t('wishList.no_wishes')}
                </p>
                <p className="text-white/50 text-sm mb-6">
                  {t('wishList.no_wishes_hint')}
                </p>
                <button
                  onClick={() => setIsFormOpen(true)}
                  className="px-6 py-3 bg-gradient-to-r from-red-600 to-green-600 hover:from-red-700 hover:to-green-700 text-white rounded-xl transition-all duration-200 flex items-center space-x-2 mx-auto">
                  <Plus size={18} />
                  <span>{t('wishList.add_first_wish')}</span>
                </button>
              </div>
            )}
          </motion.div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-8 bg-red-500/20 border border-red-500/50 rounded-lg p-4 max-w-2xl mx-auto">
              <p className="text-red-200 text-center">{error}</p>
            </motion.div>
          )}
        </div>
      </div>
    </>
  );
};

export default WishesScreen;
