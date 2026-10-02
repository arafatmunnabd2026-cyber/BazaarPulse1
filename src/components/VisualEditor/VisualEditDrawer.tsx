import React, { useState, useEffect } from 'react';
import { useVisualEditor } from '../../context/VisualEditorContext';
import { 
  X, 
  Check, 
  Trash2, 
  RotateCcw, 
  Eye, 
  EyeOff, 
  Type, 
  Palette, 
  Sparkles, 
  Sliders, 
  Link as LinkIcon,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const COLOR_PRESETS = [
  '#f85606', // Daraz/BazaarPulse Orange
  '#ea580c', // Dark Orange
  '#16a34a', // Emerald Green
  '#2563eb', // Royal Blue
  '#7c3aed', // Purple
  '#db2777', // Pink
  '#0f172a', // Dark Slate
  '#ffffff', // Pure White
  '#f1f5f9', // Light Slate
  '#fef08a'  // Light Yellow
];

const FONT_SIZES = [
  { label: 'ছোট (Small)', value: '12px' },
  { label: 'সাধারণ (Normal)', value: '14px' },
  { label: 'মিডিয়াম (Medium)', value: '16px' },
  { label: 'বড় (Large)', value: '20px' },
  { label: 'শিরোনাম (Heading)', value: '28px' },
  { label: 'মেগা (Mega)', value: '36px' }
];

export const VisualEditDrawer: React.FC = () => {
  const { 
    activeElement, 
    setActiveElement, 
    visualOverrides, 
    updateOverride, 
    resetElementOverride 
  } = useVisualEditor();

  const [text, setText] = useState('');
  const [color, setColor] = useState('');
  const [bgColor, setBgColor] = useState('');
  const [fontSize, setFontSize] = useState('');
  const [fontWeight, setFontWeight] = useState('');
  const [padding, setPadding] = useState('');
  const [borderRadius, setBorderRadius] = useState('');
  const [href, setHref] = useState('');
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!activeElement) return;
    const current = visualOverrides[activeElement.id] || {};
    setText(current.text !== undefined ? current.text : (activeElement.defaultText || ''));
    setColor(current.color || activeElement.defaultColor || '');
    setBgColor(current.bgColor || activeElement.defaultBgColor || '');
    setFontSize(current.fontSize || '');
    setFontWeight(current.fontWeight || '');
    setPadding(current.padding || '');
    setBorderRadius(current.borderRadius || '');
    setHref(current.href || activeElement.defaultHref || '');
    setHidden(!!current.hidden);
  }, [activeElement, visualOverrides]);

  if (!activeElement) return null;

  const handleApply = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    updateOverride(activeElement.id, {
      text,
      color: color || undefined,
      bgColor: bgColor || undefined,
      fontSize: fontSize || undefined,
      fontWeight: fontWeight || undefined,
      padding: padding || undefined,
      borderRadius: borderRadius || undefined,
      href: href || undefined,
      hidden
    });
    setActiveElement(null);
  };

  const handlePermanentDelete = () => {
    updateOverride(activeElement.id, { hidden: true, deleted: true });
    setActiveElement(null);
  };

  const handleReset = () => {
    resetElementOverride(activeElement.id);
    setActiveElement(null);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col text-slate-900"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center font-black text-xs shadow-sm">
                🎨
              </div>
              <div>
                <h3 className="font-bold text-sm tracking-tight">ভিজ্যুয়াল এডিটর: {activeElement.label}</h3>
                <p className="text-[10px] text-slate-400 font-mono">ID: #{activeElement.id}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveElement(null)}
              className="p-1.5 rounded-xl hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleApply} className="p-5 space-y-4 overflow-y-auto max-h-[75vh] text-left">
            
            {/* Text Content */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-orange-600" />
                টেক্সট / শিরোনাম পরিবর্তন করুন:
              </label>
              {activeElement.type === 'heading' || activeElement.type === 'section' ? (
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  rows={3}
                  placeholder="আপনার কাঙ্ক্ষিত টেক্সট লিখুন..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white transition-all font-medium"
                />
              ) : (
                <input
                  type="text"
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder="আপনার কাঙ্ক্ষিত টেক্সট লিখুন..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white transition-all font-medium"
                />
              )}
            </div>

            {/* Button Link / URL (if button or linkable) */}
            {(activeElement.type === 'button' || activeElement.defaultHref) && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <LinkIcon className="w-3.5 h-3.5 text-blue-600" />
                  বাটন লিঙ্ক / টার্গেট URL (Href):
                </label>
                <input
                  type="text"
                  value={href}
                  onChange={e => setHref(e.target.value)}
                  placeholder="যেমন: /products, #flash-sale, /category/fashion"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white font-mono"
                />
              </div>
            )}

            {/* Colors: Text Color & Background Color */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              
              {/* Text Color */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-orange-600" />
                  টেক্সটের রঙ (Color):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={color || '#0f172a'}
                    onChange={e => setColor(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200 p-0.5 bg-white"
                  />
                  <input
                    type="text"
                    value={color}
                    onChange={e => setColor(e.target.value)}
                    placeholder="#f85606 বা খালি রাখুন"
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono"
                  />
                </div>
                <div className="flex flex-wrap gap-1 pt-1">
                  {COLOR_PRESETS.map((c, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setColor(c)}
                      className="w-5 h-5 rounded-full border border-slate-300 shadow-2xs cursor-pointer hover:scale-110 transition-transform"
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
              </div>

              {/* Background Color */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-purple-600" />
                  ব্যাকগ্রাউন্ডের রঙ (Bg Color):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={bgColor || '#ffffff'}
                    onChange={e => setBgColor(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200 p-0.5 bg-white"
                  />
                  <input
                    type="text"
                    value={bgColor}
                    onChange={e => setBgColor(e.target.value)}
                    placeholder="যেমন: #f85606"
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono"
                  />
                </div>
                <div className="flex flex-wrap gap-1 pt-1">
                  {COLOR_PRESETS.map((c, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setBgColor(c)}
                      className="w-5 h-5 rounded-full border border-slate-300 shadow-2xs cursor-pointer hover:scale-110 transition-transform"
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
              </div>

            </div>

            {/* Typography: Font Size & Weight */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">ফন্ট সাইজ (Size):</label>
                <select
                  value={fontSize}
                  onChange={e => setFontSize(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs"
                >
                  <option value="">ডিফল্ট সাইজ (Default)</option>
                  {FONT_SIZES.map(f => (
                    <option key={f.value} value={f.value}>{f.label} ({f.value})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">ফন্ট ওয়েট (Weight):</label>
                <select
                  value={fontWeight}
                  onChange={e => setFontWeight(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs"
                >
                  <option value="">ডিফল্ট (Default)</option>
                  <option value="400">Normal (সাধারণ)</option>
                  <option value="600">Semi-Bold (মাঝারি মোটা)</option>
                  <option value="700">Bold (মোটা)</option>
                  <option value="900">Extra Black (খুব মোটা)</option>
                </select>
              </div>
            </div>

            {/* Advanced Styling: Padding & Border Radius */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">প্যাডিং (Padding):</label>
                <select
                  value={padding}
                  onChange={e => setPadding(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs"
                >
                  <option value="">ডিফল্ট (Default)</option>
                  <option value="4px 8px">কম (Small)</option>
                  <option value="8px 16px">সাধারণ (Normal)</option>
                  <option value="16px 24px">বড় (Spacious)</option>
                  <option value="24px 32px">মেগা (Extra Large)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">বর্ডার রেডিয়াস (Radius):</label>
                <select
                  value={borderRadius}
                  onChange={e => setBorderRadius(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs"
                >
                  <option value="">ডিফল্ট (Default)</option>
                  <option value="4px">ছোট কোণ (4px)</option>
                  <option value="12px">রাউন্ড (12px)</option>
                  <option value="24px">বড় রাউন্ড (24px)</option>
                  <option value="9999px">সম্পূর্ণ গোল (Pill)</option>
                </select>
              </div>
            </div>

            {/* Visibility Toggle */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 block">উপাদান প্রদর্শন (Visibility):</span>
                <p className="text-[11px] text-slate-500">এই টেক্সট বা বাটনটি পেজে দৃশ্যমান থাকবে কি না</p>
              </div>

              <button
                type="button"
                onClick={() => setHidden(!hidden)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  hidden 
                    ? 'bg-red-100 text-red-700 border border-red-200' 
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}
              >
                {hidden ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>অদৃশ্য (Hidden)</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    <span>দৃশ্যমান (Visible)</span>
                  </>
                )}
              </button>
            </div>

            {/* Live Preview Box */}
            <div className="bg-slate-100/80 p-3 rounded-2xl border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">লাইভ প্রিভিউ (Live Preview):</span>
              <div 
                className="p-2.5 rounded-xl border border-slate-200 text-center transition-all"
                style={{
                  color: color || undefined,
                  backgroundColor: bgColor || '#ffffff',
                  fontSize: fontSize || undefined,
                  fontWeight: fontWeight || undefined
                }}
              >
                {hidden ? (
                  <span className="text-red-500 text-xs italic">[অদৃশ্য করা হয়েছে]</span>
                ) : (
                  text || <span className="text-slate-400 italic">[খালি টেক্সট]</span>
                )}
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100 flex-wrap">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs font-bold text-slate-600 hover:text-red-600 px-3 py-2 rounded-xl hover:bg-red-50 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>রিসেট</span>
                </button>

                <button
                  type="button"
                  onClick={handlePermanentDelete}
                  className="text-xs font-bold text-rose-600 hover:text-white hover:bg-rose-600 px-3 py-2 rounded-xl border border-rose-200 flex items-center gap-1 transition-colors cursor-pointer"
                  title="এই উপাদানটি চিরতরে মুছে বা হাইড করুন"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ডিলিট (Delete)</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveElement(null)}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs px-4 py-2 rounded-xl transition-colors cursor-pointer"
                >
                  বাতিল
                </button>

                <button
                  type="submit"
                  className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-5 py-2 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>লাইভ প্রয়োগ করুন</span>
                </button>
              </div>
            </div>

          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
