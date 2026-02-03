'use client';

import { WikiMapLocation } from '@/data/mapData';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Coffee, Utensils } from 'lucide-react';

interface MapSidebarProps {
  selectedLocation: WikiMapLocation | null;
  onClose: () => void;
}

export default function MapSidebar({ selectedLocation, onClose }: MapSidebarProps) {
  return (



    <AnimatePresence>
      {selectedLocation && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed top-0 right-0 h-full w-full sm:w-96 bg-white dark:bg-zinc-900 shadow-2xl z-[1000] border-l border-zinc-200 dark:border-zinc-800 flex flex-col"
        >
          {/* Header */}
          <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-start justify-between bg-zinc-50 dark:bg-zinc-900/50">
            <div>
              <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 mb-1 text-sm font-medium uppercase tracking-wider">
                {selectedLocation.type === 'building' ? (
                  <>
                    <MapPin size={14} />
                    <span>Building</span>
                  </>
                ) : (
                  <>
                    <Utensils size={14} />
                    <span>Eatery</span>
                  </>
                )}
              </div>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {selectedLocation.name}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 -mr-2 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {selectedLocation.type === 'building' && (
              <div className="space-y-6">
                <div className="prose dark:prose-invert">
                  <p className="text-lg text-zinc-600 dark:text-zinc-300">
                    {selectedLocation.description}
                  </p>
                </div>
                
                <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
                  <button className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all shadow-lg hover:shadow-blue-500/25 flex items-center justify-center gap-2">
                    View Full Article
                  </button>
                </div>
              </div>
            )}

            {selectedLocation.type === 'eatery' && selectedLocation.menu && (
              <div className="space-y-6">
                 <div className="flex items-center gap-2 mb-4 text-amber-600 dark:text-amber-500">
                    <Coffee size={20} />
                    <h3 className="text-lg font-semibold">Menu Card</h3>
                 </div>
                 
                 <div className="grid gap-3">
                   {selectedLocation.menu.map((item, idx) => (
                     <div 
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800"
                     >
                       <span className="font-medium text-zinc-900 dark:text-zinc-200">{item.item}</span>
                       <span className="font-bold text-zinc-600 dark:text-zinc-400">{item.price}</span>
                     </div>
                   ))}
                 </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
