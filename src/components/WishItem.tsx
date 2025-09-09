import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  ExternalLink,
  Edit3,
  Trash2,
  AlertCircle,
  Star,
  StarOff
} from 'lucide-react';
import { WishItemWithMetadata, URLMetadata } from '../types/wishItem';
import { urlMetadataService } from '../services/urlMetadata';

interface WishItemProps {
  item: WishItemWithMetadata;
  onEdit: (item: WishItemWithMetadata) => void;
  onDelete: (id: string) => void;
  onMetadataUpdate?: (
    id: string,
    metadata: URLMetadata,
    error?: string
  ) => void;
  readOnly?: boolean;
}

const WishItem: React.FC<WishItemProps> = ({
  item,
  onEdit,
  onDelete,
  onMetadataUpdate,
  readOnly = false
}) => {
  const { t } = useTranslation();
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);

  useEffect(() => {
    const fetchMetadata = async () => {
      if (
        item.url &&
        !item.metadata &&
        !item.metadataError &&
        !isLoadingMetadata
      ) {
        setIsLoadingMetadata(true);
        try {
          const metadata = await urlMetadataService.fetchMetadata(item.url);
          if (onMetadataUpdate) {
            onMetadataUpdate(item.id, metadata);
          }
        } catch (error) {
          console.warn('Failed to fetch metadata for', item.url, error);
          if (onMetadataUpdate) {
            onMetadataUpdate(
              item.id,
              {} as URLMetadata,
              'Failed to load preview'
            );
          }
        } finally {
          setIsLoadingMetadata(false);
        }
      }
    };

    fetchMetadata();
  }, [
    item.url,
    item.metadata,
    item.metadataError,
    isLoadingMetadata,
    item.id,
    onMetadataUpdate
  ]);

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
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

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high':
        return t('wishItem.priority_high');
      case 'medium':
        return t('wishItem.priority_medium');
      case 'low':
        return t('wishItem.priority_low');
      default:
        return '';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 overflow-hidden">
      {/* URL Preview Section */}
      {item.url && (
        <div className="border-b border-white/10">
          {(isLoadingMetadata || item.metadataLoading) && (
            <div className="p-4 flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
              <span className="text-white/60 text-sm">
                {t('wishItem.loading_preview')}
              </span>
            </div>
          )}

          {item.metadata && (
            <div className="p-4">
              <div className="flex space-x-4">
                {item.metadata.image && (
                  <div className="w-20 h-20 flex-shrink-0">
                    <img
                      src={item.metadata.image}
                      alt={item.metadata.title || t('wishItem.product_image')}
                      className="w-full h-full object-cover rounded-lg border border-white/10"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  {item.metadata.title && (
                    <h4 className="text-white font-medium text-sm mb-1 truncate">
                      {item.metadata.title}
                    </h4>
                  )}
                  {item.metadata.siteName && (
                    <p className="text-white/60 text-xs mb-2">
                      {item.metadata.siteName}
                    </p>
                  )}
                  {item.metadata.description && (
                    <p className="text-white/70 text-xs line-clamp-2">
                      {item.metadata.description}
                    </p>
                  )}
                  {(item.metadata.price || item.metadata.currency) && (
                    <div className="mt-2">
                      <span className="text-green-400 text-sm font-medium">
                        {item.metadata.price} {item.metadata.currency}
                      </span>
                      {item.metadata.availability && (
                        <span className="text-white/60 text-xs ml-2">
                          • {item.metadata.availability}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {item.metadataError && (
            <div className="p-3 flex items-center space-x-2 bg-red-500/10 border-red-500/20">
              <AlertCircle className="text-red-400" size={16} />
              <span className="text-red-200 text-xs">
                {t('wishItem.preview_error')}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Content Section */}
      <div className="p-4">
        <div className="flex items-start justify-between space-x-3">
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">
              {item.description}
            </p>

            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1 mt-2 text-blue-300 hover:text-blue-200 text-xs transition-colors">
                <ExternalLink size={12} />
                <span className="truncate max-w-48">{item.url}</span>
              </a>
            )}
          </div>

          <div className="flex items-center space-x-2 flex-shrink-0">
            <div
              className="flex items-center space-x-1"
              title={getPriorityLabel(item.priority)}>
              {getPriorityIcon(item.priority)}
            </div>

            {!readOnly && (
              <div className="flex space-x-1">
                <button
                  onClick={() => onEdit(item)}
                  className="p-1 text-white/60 hover:text-white hover:bg-white/10 rounded transition-colors"
                  title={t('wishItem.edit')}>
                  <Edit3 size={14} />
                </button>
                <button
                  onClick={() => onDelete(item.id)}
                  className="p-1 text-white/60 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                  title={t('wishItem.delete')}>
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/10">
          <span className="text-white/50 text-xs">
            {t('wishItem.created_on', {
              date: new Date(item.createdAt).toLocaleDateString()
            })}
          </span>
          <span className="text-white/60 text-xs">
            {getPriorityLabel(item.priority)}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default WishItem;
