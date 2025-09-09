import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Save, X, Link2, Star, StarOff, AlertCircle } from 'lucide-react';
import { WishItemWithMetadata, URLMetadata } from '../types/wishItem';
import { urlMetadataService } from '../services/urlMetadata';

interface WishFormProps {
  item?: WishItemWithMetadata;
  onSave: (
    item: Omit<WishItemWithMetadata, 'id' | 'createdAt' | 'updatedAt'> & {
      id?: string;
    }
  ) => void;
  onCancel: () => void;
  isOpen: boolean;
}

const WishForm: React.FC<WishFormProps> = ({
  item,
  onSave,
  onCancel,
  isOpen
}) => {
  const { t } = useTranslation();
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [metadata, setMetadata] = useState<URLMetadata | null>(null);
  const [metadataError, setMetadataError] = useState('');
  const [urlError, setUrlError] = useState('');

  useEffect(() => {
    if (item) {
      setDescription(item.description || '');
      setUrl(item.url || '');
      setPriority(item.priority || 'medium');
      setMetadata(item.metadata || null);
      setMetadataError(item.metadataError || '');
    } else {
      setDescription('');
      setUrl('');
      setPriority('medium');
      setMetadata(null);
      setMetadataError('');
    }
    setUrlError('');
  }, [item, isOpen]);

  const validateUrl = (urlString: string): boolean => {
    if (!urlString) return true;
    try {
      new URL(urlString);
      return true;
    } catch {
      return false;
    }
  };

  const handleUrlChange = async (newUrl: string) => {
    setUrl(newUrl);
    setUrlError('');
    setMetadata(null);
    setMetadataError('');

    if (!newUrl) return;

    if (!validateUrl(newUrl)) {
      setUrlError(t('wishForm.invalid_url'));
      return;
    }

    // Fetch metadata after a short delay
    const timeoutId = setTimeout(async () => {
      setIsLoadingMetadata(true);
      try {
        const fetchedMetadata = await urlMetadataService.fetchMetadata(newUrl);
        setMetadata(fetchedMetadata);
      } catch (error) {
        console.warn('Failed to fetch metadata for', newUrl, error);
        setMetadataError(t('wishForm.metadata_fetch_error'));
      } finally {
        setIsLoadingMetadata(false);
      }
    }, 800);

    return () => clearTimeout(timeoutId);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim()) {
      return;
    }

    if (url && !validateUrl(url)) {
      setUrlError(t('wishForm.invalid_url'));
      return;
    }

    const wishData = {
      id: item?.id,
      description: description.trim(),
      url: url.trim() || undefined,
      priority,
      metadata: metadata || undefined,
      metadataError: metadataError || undefined
    };

    onSave(wishData);
  };

  const getPriorityIcon = (priorityLevel: string) => {
    switch (priorityLevel) {
      case 'high':
        return <Star className="text-red-400 fill-current" size={16} />;
      case 'medium':
        return <Star className="text-yellow-400 fill-current" size={16} />;
      case 'low':
        return <StarOff className="text-gray-400" size={16} />;
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-gradient-to-br from-purple-900/90 to-blue-900/90 backdrop-blur-md rounded-2xl border border-white/20 p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">
            {item ? t('wishForm.edit_wish') : t('wishForm.add_wish')}
          </h3>
          <button
            onClick={onCancel}
            className="p-1 text-white/60 hover:text-white hover:bg-white/10 rounded transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Description */}
          <div>
            <label className="block text-white text-sm font-medium mb-2">
              {t('wishForm.description_label')} *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('wishForm.description_placeholder')}
              className="w-full h-24 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all duration-200 resize-none"
              maxLength={500}
              required
            />
            <div className="flex justify-between items-center mt-1">
              <span className="text-white/50 text-xs">
                {t('wishForm.character_count', {
                  current: description.length,
                  max: 500
                })}
              </span>
            </div>
          </div>

          {/* URL */}
          <div>
            <label className="block text-white text-sm font-medium mb-2">
              <Link2 size={14} className="inline mr-1" />
              {t('wishForm.url_label')}
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder={t('wishForm.url_placeholder')}
              className={`w-full px-3 py-2 bg-white/10 border rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all duration-200 ${
                urlError ? 'border-red-500' : 'border-white/20'
              }`}
            />
            {urlError && (
              <p className="text-red-300 text-xs mt-1 flex items-center">
                <AlertCircle size={12} className="mr-1" />
                {urlError}
              </p>
            )}
            <p className="text-white/50 text-xs mt-1">
              {t('wishForm.url_hint')}
            </p>
          </div>

          {/* URL Preview */}
          {isLoadingMetadata && (
            <div className="bg-white/5 rounded-lg p-3 flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span className="text-white/60 text-sm">
                {t('wishForm.loading_preview')}
              </span>
            </div>
          )}

          {metadata && (
            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <div className="flex space-x-3">
                {metadata.image && (
                  <img
                    src={metadata.image}
                    alt={metadata.title || 'Product'}
                    className="w-16 h-16 object-cover rounded border border-white/10"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  {metadata.title && (
                    <h5 className="text-white font-medium text-sm mb-1 truncate">
                      {metadata.title}
                    </h5>
                  )}
                  {metadata.siteName && (
                    <p className="text-white/60 text-xs mb-1">
                      {metadata.siteName}
                    </p>
                  )}
                  {(metadata.price || metadata.currency) && (
                    <p className="text-green-400 text-sm">
                      {metadata.price} {metadata.currency}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {metadataError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center space-x-2">
              <AlertCircle className="text-red-400" size={16} />
              <span className="text-red-200 text-sm">{metadataError}</span>
            </div>
          )}

          {/* Priority */}
          <div>
            <label className="block text-white text-sm font-medium mb-3">
              {t('wishForm.priority_label')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['low', 'medium', 'high'] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setPriority(level)}
                  className={`p-3 rounded-lg border transition-all duration-200 flex items-center justify-center space-x-2 ${
                    priority === level
                      ? 'bg-white/20 border-white/40 text-white'
                      : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                  }`}>
                  {getPriorityIcon(level)}
                  <span className="text-sm">
                    {t(`wishForm.priority_${level}`)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors border border-white/20">
              {t('wishForm.cancel')}
            </button>
            <button
              type="submit"
              disabled={!description.trim() || !!urlError}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2">
              <Save size={16} />
              <span>
                {item
                  ? t('wishForm.save_changes')
                  : t('wishForm.add_wish_button')}
              </span>
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default WishForm;
