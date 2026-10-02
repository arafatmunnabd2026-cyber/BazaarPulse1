import React, { createContext, useContext, useState, useEffect } from 'react';

export interface VisualOverride {
  text?: string;
  color?: string;
  bgColor?: string;
  fontSize?: string;
  fontWeight?: string;
  hidden?: boolean;
  href?: string;
  padding?: string;
  borderRadius?: string;
  customClass?: string;
}

export interface VisualElementConfig {
  id: string;
  label: string;
  type: 'text' | 'button' | 'badge' | 'section' | 'image' | 'heading';
  defaultText?: string;
  defaultColor?: string;
  defaultBgColor?: string;
  defaultHref?: string;
}

interface VisualEditorContextType {
  isVisualEditMode: boolean;
  setIsVisualEditMode: (val: boolean) => void;
  toggleVisualEditMode: () => void;
  visualOverrides: Record<string, VisualOverride>;
  updateOverride: (id: string, override: Partial<VisualOverride>) => void;
  resetElementOverride: (id: string) => void;
  toggleElementVisibility: (id: string) => void;
  saveAllOverrides: () => Promise<boolean>;
  resetAllOverrides: () => Promise<boolean>;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  activeElement: VisualElementConfig | null;
  setActiveElement: (el: VisualElementConfig | null) => void;
  isPreviewMode: boolean;
  setIsPreviewMode: (val: boolean) => void;
}

const VisualEditorContext = createContext<VisualEditorContextType | undefined>(undefined);

export const VisualEditorProvider: React.FC<{ children: React.ReactNode; notify?: (msg: string) => void }> = ({ 
  children, 
  notify = () => {} 
}) => {
  const [isVisualEditMode, setIsVisualEditMode] = useState<boolean>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('visual_builder') === 'true' || urlParams.get('edit_mode') === 'true') {
        return true;
      }
      return localStorage.getItem('bazaarpulse_visual_edit_active') === 'true';
    } catch {
      return false;
    }
  });

  const [visualOverrides, setVisualOverrides] = useState<Record<string, VisualOverride>>(() => {
    try {
      const cached = localStorage.getItem('bazaarpulse_visual_overrides');
      return cached ? JSON.parse(cached) : {};
    } catch {
      return {};
    }
  });

  const [initialOverrides, setInitialOverrides] = useState<Record<string, VisualOverride>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [activeElement, setActiveElement] = useState<VisualElementConfig | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);

  // Fetch overrides from backend API on mount
  useEffect(() => {
    const fetchVisualOverrides = async () => {
      try {
        const res = await fetch('/api/visual-editor/content');
        const data = await res.json();
        if (data.success && data.visualOverrides && typeof data.visualOverrides === 'object') {
          setVisualOverrides(data.visualOverrides);
          setInitialOverrides(data.visualOverrides);
          try {
            localStorage.setItem('bazaarpulse_visual_overrides', JSON.stringify(data.visualOverrides));
          } catch (e) {}
        }
      } catch (err) {
        console.warn('Visual editor content load note:', err);
      }
    };

    fetchVisualOverrides();

    const handleBroadcast = () => {
      fetchVisualOverrides();
    };
    window.addEventListener('bazaarpulse-visual-content-updated', handleBroadcast);
    return () => {
      window.removeEventListener('bazaarpulse-visual-content-updated', handleBroadcast);
    };
  }, []);

  // Save edit mode state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('bazaarpulse_visual_edit_active', isVisualEditMode ? 'true' : 'false');
    } catch (e) {}
  }, [isVisualEditMode]);

  const toggleVisualEditMode = () => {
    setIsVisualEditMode(prev => {
      const next = !prev;
      if (next) {
        notify('🎨 Visual Page Builder সক্রিয় করা হয়েছে! যেকোনো টেক্সট বা বাটনে ক্লিক করে পরিবর্তন করুন।');
      } else {
        notify('👁️ প্রিভিউ মোডে ফেরত আসা হয়েছে।');
      }
      return next;
    });
  };

  const updateOverride = (id: string, override: Partial<VisualOverride>) => {
    setVisualOverrides(prev => {
      const current = prev[id] || {};
      const updated = {
        ...prev,
        [id]: {
          ...current,
          ...override
        }
      };
      try {
        localStorage.setItem('bazaarpulse_visual_overrides', JSON.stringify(updated));
      } catch (e) {}
      setHasUnsavedChanges(true);
      return updated;
    });
  };

  const resetElementOverride = (id: string) => {
    setVisualOverrides(prev => {
      const updated = { ...prev };
      delete updated[id];
      try {
        localStorage.setItem('bazaarpulse_visual_overrides', JSON.stringify(updated));
      } catch (e) {}
      setHasUnsavedChanges(true);
      return updated;
    });
    notify(`↩️ "${id}" এর কাস্টমাইজেশন রিসেট করা হয়েছে`);
  };

  const toggleElementVisibility = (id: string) => {
    setVisualOverrides(prev => {
      const current = prev[id] || {};
      const isCurrentlyHidden = !!current.hidden;
      const updated = {
        ...prev,
        [id]: {
          ...current,
          hidden: !isCurrentlyHidden
        }
      };
      try {
        localStorage.setItem('bazaarpulse_visual_overrides', JSON.stringify(updated));
      } catch (e) {}
      setHasUnsavedChanges(true);
      notify(isCurrentlyHidden ? `👁️ "${id}" পুনরায় প্রদর্শিত করা হলো` : `🙈 "${id}" চোখের আড়ালে (Hide) করা হলো`);
      return updated;
    });
  };

  const saveAllOverrides = async (): Promise<boolean> => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/visual-editor/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visualOverrides })
      });
      const data = await res.json();
      if (data.success) {
        setInitialOverrides(visualOverrides);
        setHasUnsavedChanges(false);
        try {
          localStorage.setItem('bazaarpulse_visual_overrides', JSON.stringify(visualOverrides));
        } catch (e) {}
        notify('💾 সকল ভিজ্যুয়াল পরিবর্তন ডাটাবেজে সফলভাবে সেভ করা হয়েছে!');
        return true;
      } else {
        notify('❌ সেভ ব্যর্থ হয়েছে: ' + (data.error || 'Server error'));
        return false;
      }
    } catch (err: any) {
      notify('❌ নেটওয়ার্ক ত্রুটি: পরিবর্তন সেভ করা যায়নি');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const resetAllOverrides = async (): Promise<boolean> => {
    if (!window.confirm('আপনি কি নিশ্চিত যে সকল ভিজ্যুয়াল কাস্টমাইজেশন মুছে ডিফল্ট ডিজাইনে ফিরতে চান?')) {
      return false;
    }
    setIsSaving(true);
    try {
      const res = await fetch('/api/visual-editor/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        setVisualOverrides({});
        setInitialOverrides({});
        setHasUnsavedChanges(false);
        try {
          localStorage.removeItem('bazaarpulse_visual_overrides');
        } catch (e) {}
        notify('🔄 সকল কাস্টমাইজেশন রিসেট করে ডিফল্ট ডিজাইনে ফিরিয়ে নেওয়া হয়েছে!');
        return true;
      }
      return false;
    } catch (err) {
      notify('❌ রিসেট ব্যর্থ হয়েছে');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <VisualEditorContext.Provider
      value={{
        isVisualEditMode,
        setIsVisualEditMode,
        toggleVisualEditMode,
        visualOverrides,
        updateOverride,
        resetElementOverride,
        toggleElementVisibility,
        saveAllOverrides,
        resetAllOverrides,
        hasUnsavedChanges,
        isSaving,
        activeElement,
        setActiveElement,
        isPreviewMode,
        setIsPreviewMode
      }}
    >
      {children}
    </VisualEditorContext.Provider>
  );
};

export const useVisualEditor = () => {
  const context = useContext(VisualEditorContext);
  if (!context) {
    throw new Error('useVisualEditor must be used within a VisualEditorProvider');
  }
  return context;
};
