import React from 'react';
import { useVisualEditor } from '../../context/VisualEditorContext';
import { 
  Sparkles, 
  Save, 
  RotateCcw, 
  Eye, 
  Edit3, 
  X, 
  CheckCircle2, 
  Loader2, 
  Layers, 
  HelpCircle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface VisualEditorToolbarProps {
  isAdmin?: boolean;
}

export const VisualEditorToolbar: React.FC<VisualEditorToolbarProps> = ({ isAdmin = false }) => {
  const {
    isVisualEditMode,
    setIsVisualEditMode,
    toggleVisualEditMode,
    hasUnsavedChanges,
    saveAllOverrides,
    resetAllOverrides,
    isSaving,
    isPreviewMode,
    setIsPreviewMode
  } = useVisualEditor();

  // If edit mode is OFF, do not render floating button on storefront
  if (!isVisualEditMode) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        className="fixed top-0 left-0 right-0 z-[190] bg-slate-950/95 text-white border-b border-orange-500/30 shadow-2xl backdrop-blur-md px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2.5"
      >
        {/* Left: Status & Mode */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-orange-600 flex items-center justify-center font-bold shadow-md">
            <Edit3 className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black text-white tracking-tight">Visual Page Builder</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                isPreviewMode 
                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' 
                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 animate-pulse'
              }`}>
                {isPreviewMode ? '👁️ কাস্টমার প্রিভিউ মোড' : '✏️ লাইভ এডিট মোড (Click to Edit)'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block">
              যেকোনো শিরোনাম, টেক্সট বা বাটনে ক্লিক করলেই এডিট প্যানেল ওপেন হবে।
            </p>
          </div>
        </div>

        {/* Center/Right: Actions */}
        <div className="flex items-center flex-wrap gap-2">
          
          {/* Preview / Edit Mode Switch */}
          <button
            type="button"
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
              isPreviewMode
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{isPreviewMode ? 'এডিট মোডে ফিরুন' : 'প্রিভিউ দেখুন'}</span>
          </button>

          {/* Reset All */}
          <button
            type="button"
            onClick={resetAllOverrides}
            disabled={isSaving}
            className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-slate-800 transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
            title="সকল পরিবর্তন মুছে ডিফল্ট ডিজাইনে ফিরুন"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">রিসেট (Reset)</span>
          </button>

          {/* Save to Database */}
          <button
            type="button"
            onClick={saveAllOverrides}
            disabled={isSaving}
            className={`px-4 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-lg disabled:opacity-50 ${
              hasUnsavedChanges
                ? 'bg-orange-600 hover:bg-orange-700 text-white ring-2 ring-orange-400 animate-bounce'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>সেভ হচ্ছে...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>{hasUnsavedChanges ? '💾 সেভ করুন (Save Changes)' : '✓ সেভ করা আছে'}</span>
              </>
            )}
          </button>

          {/* Exit / Close Builder */}
          <button
            type="button"
            onClick={() => setIsVisualEditMode(false)}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="বিল্ডার মোড বন্ধ করুন"
          >
            <X className="w-4 h-4" />
          </button>

        </div>
      </motion.div>
    </AnimatePresence>
  );
};
