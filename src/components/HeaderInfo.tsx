import { useState } from 'react';
import { BookOpen, Globe, ChevronDown, PinOff } from 'lucide-react';
import Modal from './Modal';
import { useT } from '../i18n';
import { GOOGLE_FLOW_URL } from '../App';

export default function HeaderInfo({ onOpenSettings }: { onOpenSettings: () => void }) {
  const t = useT();
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <>
      {/* Header - Fixed */}
      <div className="shrink-0 flex items-center justify-between px-3 py-1.5 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gradient-to-br from-orange-400 to-red-500 rounded-sm flex items-center justify-center">
            <span className="text-[8px] font-black text-slate-800">V</span>
          </div>
          <span className="text-[11px] font-medium text-slate-700">Flow Automation - Auto Flow on Google Flow</span>
        </div>
        <PinOff className="w-3.5 h-3.5 text-slate-500" />
      </div>

      {/* Header Info */}
      <div className="p-4 flex flex-col shrink-0">
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h1 className="text-[22px] font-bold text-slate-800 tracking-tight leading-none">{t('app_name')}</h1>
              <span className="bg-[#facc15] text-black text-[10px] font-bold px-1.5 py-0.5 rounded leading-none">v3.3.8</span>
            </div>
            <p className="text-slate-500 leading-tight text-xs mt-1 whitespace-pre-line">{t('tagline')}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-4 text-slate-600">
              <button
                onClick={() => setGuideOpen(true)}
                className="flex flex-col items-center gap-1 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />
                <span className="text-[10px] font-bold">{t('user_guide')}</span>
              </button>
              <a
                href={GOOGLE_FLOW_URL}
                target="_blank"
                rel="noreferrer"
                className="flex flex-col items-center gap-1 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <Globe className="w-4 h-4" />
                <span className="text-[10px] font-bold">Google Flow</span>
              </a>
            </div>
            <button
              onClick={onOpenSettings}
              className="flex items-center gap-2 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded px-2 py-1 text-slate-800 text-xs mt-2 transition-colors cursor-pointer font-medium"
            >
              {t('setting_language')} <ChevronDown className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {guideOpen && (
        <Modal title={t('user_guide')} onClose={() => setGuideOpen(false)}>
          <p className="text-[12px] text-slate-700 whitespace-pre-wrap leading-relaxed">{t('guide_content')}</p>
        </Modal>
      )}
    </>
  );
}