import React from 'react';
import { useVisualEditor, VisualElementConfig } from '../../context/VisualEditorContext';
import { Edit3, EyeOff, Eye, Sparkles } from 'lucide-react';

interface EditableElementProps {
  id: string;
  label: string;
  type?: 'text' | 'button' | 'badge' | 'section' | 'image' | 'heading';
  defaultText?: string;
  defaultColor?: string;
  defaultBgColor?: string;
  defaultHref?: string;
  className?: string;
  style?: React.CSSProperties;
  as?: React.ElementType;
  children?: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  [key: string]: any;
}

export const EditableElement: React.FC<EditableElementProps> = ({
  id,
  label,
  type = 'text',
  defaultText = '',
  defaultColor,
  defaultBgColor,
  defaultHref,
  className = '',
  style = {},
  as: Component = 'div',
  children,
  onClick,
  ...rest
}) => {
  const { 
    isVisualEditMode, 
    visualOverrides, 
    setActiveElement, 
    toggleElementVisibility,
    isPreviewMode 
  } = useVisualEditor();

  const override = visualOverrides[id] || {};
  const isHidden = !!override.hidden || !!override.deleted;
  const displayText = override.text !== undefined ? override.text : (defaultText || (typeof children === 'string' ? children : ''));

  // If edit mode is OFF (or in preview mode) and element is marked hidden/deleted, do not render at all
  if ((!isVisualEditMode || isPreviewMode) && isHidden) {
    return null;
  }

  const computedStyle: React.CSSProperties = {
    ...style,
    ...(override.color ? { color: override.color } : defaultColor ? { color: defaultColor } : {}),
    ...(override.bgColor ? { backgroundColor: override.bgColor } : defaultBgColor ? { backgroundColor: defaultBgColor } : {}),
    ...(override.fontSize ? { fontSize: override.fontSize } : {}),
    ...(override.fontWeight ? { fontWeight: override.fontWeight } : {}),
    ...(override.padding ? { padding: override.padding } : {}),
    ...(override.borderRadius ? { borderRadius: override.borderRadius } : {})
  };

  const handleEditClick = (e: React.MouseEvent) => {
    if (isVisualEditMode && !isPreviewMode) {
      e.preventDefault();
      e.stopPropagation();
      const config: VisualElementConfig = {
        id,
        label,
        type,
        defaultText: defaultText || (typeof children === 'string' ? children : ''),
        defaultColor,
        defaultBgColor,
        defaultHref
      };
      setActiveElement(config);
      return;
    }

    if (onClick) {
      onClick(e);
    }
  };

  const handleToggleHide = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleElementVisibility(id);
  };

  const renderContent = () => {
    if (type === 'section' && children) {
      if (override.text) return override.text;
      return children;
    }
    return displayText !== '' ? displayText : children;
  };

  // When Visual Edit Mode is active and not in preview: render with interactive visual builder controls
  if (isVisualEditMode && !isPreviewMode) {
    const isSection = type === 'section';
    return (
      <div 
        className={`relative group/visual-editable transition-all duration-200 ${isSection ? 'w-full block' : 'inline-block'} ${
          isHidden 
            ? 'opacity-40 grayscale border-2 border-dashed border-red-500 bg-red-50/20 p-1.5 rounded-2xl' 
            : 'hover:outline-2 hover:outline-dashed hover:outline-orange-500 hover:bg-orange-500/10 cursor-pointer rounded-xl'
        }`}
        onClick={handleEditClick}
        title={`Click to edit "${label}" visually`}
      >
        {/* Floating Quick Action Badge */}
        <div className="absolute -top-3.5 -right-2 z-30 hidden group-hover/visual-editable:flex items-center gap-1 bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg border border-slate-700 animate-in fade-in duration-150 pointer-events-auto">
          <Edit3 className="w-2.5 h-2.5 text-orange-400" />
          <span className="truncate max-w-[120px]">{label}</span>
          <button
            type="button"
            onClick={handleToggleHide}
            title={isHidden ? 'Show Element' : 'Delete / Hide from View'}
            className="ml-1 p-0.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white"
          >
            {isHidden ? <Eye className="w-3 h-3 text-emerald-400" /> : <EyeOff className="w-3 h-3 text-red-400" />}
          </button>
        </div>

        {/* Hidden Label Pill if hidden */}
        {isHidden && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-2xs rounded-xl pointer-events-none z-20">
            <span className="bg-red-600 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
              <EyeOff className="w-3 h-3" /> Hidden (ডিলিট/অদৃশ্য করা হয়েছে)
            </span>
          </div>
        )}

        {/* Inner Content */}
        <Component
          className={`${className} ${override.customClass || ''}`}
          style={computedStyle}
          {...(type === 'button' && override.href ? { href: override.href } : {})}
          {...rest}
        >
          {renderContent()}
        </Component>
      </div>
    );
  }

  // Normal Customer View: clean, standard rendering without any builder wrappers
  return (
    <Component
      className={`${className} ${override.customClass || ''}`}
      style={computedStyle}
      onClick={onClick}
      {...(type === 'button' && override.href ? { href: override.href } : {})}
      {...rest}
    >
      {renderContent()}
    </Component>
  );
};
