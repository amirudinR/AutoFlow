import { useState } from 'react';
import { ChevronDown, SlidersHorizontal, Settings, Image as ImageIcon, Video, RotateCw, RotateCcw, Download, Languages, Info, Folder } from 'lucide-react';
import SettingBlock from './SettingBlock';
import Modal from './Modal';
import { useT } from '../i18n';

export default function SettingsTab({
  defaultMode, setDefaultMode,
  videoModel, setVideoModel,
  imageModel, setImageModel,
  aspectRatio, setAspectRatio,
  videoOption, setVideoOption,
  imageModeOption, setImageModeOption,
  maxRetries, setMaxRetries,
  autoDownloadVideo, setAutoDownloadVideo,
  autoDownloadImage, setAutoDownloadImage,
  autoDownloadEnabled, setAutoDownloadEnabled,
  folderName,
  language, setLanguage,
  handleResetDefaults
}: any) {
  const t = useT();
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);

  const selectClass = "w-full bg-white border border-slate-200 text-slate-800 rounded px-2 py-2 text-[13px] appearance-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="flex flex-col gap-3">
      <SettingBlock icon={SlidersHorizontal} title={t('setting_default_mode')} description={t('desc_default_mode')}>
        <div className="relative">
          <select
            value={defaultMode}
            onChange={(e) => setDefaultMode(e.target.value)}
            className={selectClass}
          >
            <option value="Text to Image">{t('mode_t2i')}</option>
            <option value="Text to Video">{t('mode_ttv')}</option>
            <option value="Frame to Video">{t('mode_ftv')}</option>
            <option value="Ingredients to Video">{t('mode_itv')}</option>
            <option value="Image to Image">{t('mode_i2i')}</option>
            <option value="Agent Automation">{t('mode_agent')}</option>
          </select>
          <ChevronDown className="w-4 h-4 absolute right-2 top-2.5 text-slate-500 pointer-events-none" />
        </div>
      </SettingBlock>

      <SettingBlock icon={Settings} title={t('setting_model')} description={t('desc_model')}>
        <div className="relative">
          <select
            value={videoModel}
            onChange={(e) => setVideoModel(e.target.value)}
            className={selectClass}
          >
            <option>Veo 3.1 - Lite</option>
            <option>Veo 3.1 - Lite [Lower Priority]</option>
            <option>Veo 3.1 - Fast</option>
            <option>Veo 3.1 - Quality</option>
            <option>Omni 1.1 Flash (Pro,Ultra plan required)</option>
          </select>
          <ChevronDown className="w-4 h-4 absolute right-2 top-2.5 text-slate-500 pointer-events-none" />
        </div>
      </SettingBlock>

      <SettingBlock icon={Settings} title={t('setting_image_model')} description={t('desc_image_model')}>
        <div className="relative">
          <select
            value={imageModel}
            onChange={(e) => setImageModel(e.target.value)}
            className="w-full bg-white border border-blue-500 text-slate-800 rounded px-2 py-2 text-[13px] appearance-none focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            <option>🍌 Nano Banana Pro</option>
            <option>🍌 Nano Banana 2</option>
            <option>🍌 Nano Banana 2 Lite</option>
          </select>
          <ChevronDown className="w-4 h-4 absolute right-2 top-2.5 text-slate-500 pointer-events-none" />
        </div>
      </SettingBlock>

      <SettingBlock icon={ImageIcon} title={t('setting_aspect_ratio')} description={t('desc_aspect_ratio')}>
        <div className="relative">
          <select
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value)}
            className={selectClass}
          >
            <option>16:9 (YouTube)</option>
            <option>9:16 (Shorts/Reels)</option>
            <option>1:1 (Square)</option>
            <option>3:4 (Portrait)</option>
            <option>4:3 (Landscape)</option>
          </select>
          <ChevronDown className="w-4 h-4 absolute right-2 top-2.5 text-slate-500 pointer-events-none" />
        </div>
      </SettingBlock>

      <SettingBlock icon={Video} title={t('setting_video_option')} description={t('desc_video_option')}>
        <div className="relative">
          <select
            value={videoOption}
            onChange={(e) => setVideoOption(e.target.value)}
            className={selectClass}
          >
            <option>8 seconds</option>
            <option>4 seconds</option>
            <option>6 seconds</option>
            <option>10 seconds</option>
            <option>4 seconds (concat) Ultra plan required</option>
            <option>6 seconds (concat) Ultra plan required</option>
          </select>
          <ChevronDown className="w-4 h-4 absolute right-2 top-2.5 text-slate-500 pointer-events-none" />
        </div>
      </SettingBlock>

      <SettingBlock icon={ImageIcon} title={t('setting_image_mode')} description={t('desc_image_mode')}>
        <div className="relative">
          <select
            value={imageModeOption}
            onChange={(e) => setImageModeOption(e.target.value)}
            className={selectClass}
          >
            <option>New Image</option>
            <option>Last Image</option>
          </select>
          <ChevronDown className="w-4 h-4 absolute right-2 top-2.5 text-slate-500 pointer-events-none" />
        </div>
      </SettingBlock>

      <SettingBlock icon={RotateCw} title={t('setting_max_retries')} description={t('desc_max_retries')}>
        <div className="flex border border-slate-200 rounded overflow-hidden">
          <button
            onClick={() => setMaxRetries((prev: number) => Math.max(1, prev - 1))}
            className="px-4 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center border-r border-slate-200 cursor-pointer"
          >
            <span className="text-lg leading-none mb-0.5">-</span>
          </button>
          <input
            type="number"
            value={maxRetries}
            onChange={(e) => setMaxRetries(Math.min(20, Math.max(1, Number(e.target.value))))}
            className="w-full bg-white text-slate-800 text-center text-[13px] focus:outline-none"
          />
          <button
            onClick={() => setMaxRetries((prev: number) => Math.min(20, prev + 1))}
            className="px-4 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center border-l border-slate-200 cursor-pointer"
          >
            <span className="text-lg leading-none mb-0.5">+</span>
          </button>
        </div>
      </SettingBlock>

      <SettingBlock icon={Download} title={t('auto_download')} description={t('desc_auto_download')}>
        <div className="flex items-center justify-between gap-3">
          <span className={`text-[12px] font-medium ${autoDownloadEnabled ? 'text-green-600' : 'text-slate-400'}`}>
            {autoDownloadEnabled ? `${t('auto_download_on')} · ${autoDownloadVideo} / ${autoDownloadImage}` : t('auto_download_off')}
          </span>
          <button
            onClick={() => setAutoDownloadEnabled(!autoDownloadEnabled)}
            className={`w-10 h-5 rounded-full relative transition-colors shrink-0 cursor-pointer ${autoDownloadEnabled ? 'bg-blue-600' : 'bg-slate-300'}`}
          >
            <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all shadow-sm ${autoDownloadEnabled ? 'right-0.5' : 'left-0.5'}`}></div>
          </button>
        </div>
      </SettingBlock>

      <SettingBlock icon={Download} title={t('setting_download_video')} description={t('desc_download_video')}>
        <div className="relative">
          <select
            value={autoDownloadVideo}
            onChange={(e) => setAutoDownloadVideo(e.target.value)}
            className={selectClass}
            disabled={!autoDownloadEnabled}
          >
            <option>480p</option>
            <option>720p</option>
            <option>No Download</option>
            <option>1080p (Ultra/Pro plan required)</option>
            <option>4K (Ultra/Pro plan required)</option>
          </select>
          <ChevronDown className="w-4 h-4 absolute right-2 top-2.5 text-slate-500 pointer-events-none" />
        </div>
      </SettingBlock>

      <SettingBlock icon={Download} title={t('setting_download_image')} description={t('desc_download_image')}>
        <div className="relative">
          <select
            value={autoDownloadImage}
            onChange={(e) => setAutoDownloadImage(e.target.value)}
            className={selectClass}
            disabled={!autoDownloadEnabled}
          >
            <option>2k</option>
            <option>No Download</option>
            <option>1k</option>
            <option>4k (Ultra plan required)</option>
          </select>
          <ChevronDown className="w-4 h-4 absolute right-2 top-2.5 text-slate-500 pointer-events-none" />
        </div>
      </SettingBlock>

      <SettingBlock icon={Languages} title={t('setting_language')} description={t('desc_language')}>
        <div className="relative">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className={selectClass}
          >
            <option>English</option>
            <option>Tiếng Việt</option>
            <option>中文</option>
            <option>한국어</option>
            <option>Español</option>
            <option>日本語</option>
            <option>Português (Brasil)</option>
            <option>हिन्दी</option>
            <option>اردو</option>
            <option>Türkçe</option>
            <option>العربية</option>
            <option>Deutsch</option>
            <option>Français</option>
            <option>Bahasa Indonesia</option>
            <option>Italiano</option>
            <option>Русский</option>
            <option>Nederlands</option>
            <option>ไทย</option>
            <option>বাংলা</option>
            <option>Filipino</option>
          </select>
          <ChevronDown className="w-4 h-4 absolute right-2 top-2.5 text-slate-500 pointer-events-none" />
        </div>
      </SettingBlock>

      <div className="flex items-start gap-3 mt-1 px-1">
        <Download className="w-4 h-4 text-slate-800 mt-1 shrink-0" />
        <div className="flex flex-col gap-0.5 flex-1">
          <span className="font-bold text-slate-800 text-[12px]">{t('download_settings')}</span>
          <span className="text-[11px] text-slate-500 leading-tight">{t('desc_download_settings')}</span>
        </div>
        <button
          onClick={() => setDownloadModalOpen(true)}
          className="p-1.5 bg-transparent hover:bg-slate-100 border border-slate-200 rounded transition-colors cursor-pointer text-slate-500 hover:text-slate-800"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      <div className="flex gap-3 mt-4 shrink-0">
        <button
          onClick={handleResetDefaults}
          className="flex-1 flex items-center justify-center gap-1.5 bg-transparent border border-slate-200 hover:bg-slate-100 text-slate-700 rounded py-2 transition-colors cursor-pointer font-medium text-xs"
        >
          <RotateCcw className="w-3.5 h-3.5" /> {t('reset_defaults')}
        </button>
        <button
          onClick={() => alert(t('settings_saved'))}
          className="flex-1 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-bold rounded py-2 transition-colors cursor-pointer text-xs"
        >
          {t('save_settings')}
        </button>
      </div>

      <div className="bg-slate-50 rounded p-2.5 flex items-center gap-2 mt-2 border border-slate-200">
        <Info className="w-4 h-4 text-slate-800 shrink-0" />
        <span className="text-[11px] text-slate-600">{t('sync_info')}</span>
      </div>

      {downloadModalOpen && <Modal title={t('download_settings')} onClose={() => setDownloadModalOpen(false)}>
        <div className="flex flex-col gap-3">
          <div className="bg-slate-50 border border-slate-200 rounded p-3 flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-slate-800 font-medium text-xs">
              <Download className="w-3.5 h-3.5" /> {t('setting_download_video')}
            </div>
            <div className="text-[11px] text-slate-600 pl-5">{autoDownloadVideo}</div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded p-3 flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-slate-800 font-medium text-xs">
              <Download className="w-3.5 h-3.5" /> {t('setting_download_image')}
            </div>
            <div className="text-[11px] text-slate-600 pl-5">{autoDownloadImage}</div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded p-3 flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-slate-800 font-medium text-xs">
              <Folder className="w-3.5 h-3.5" /> {t('save_to_folder')}
            </div>
            <div className="text-[11px] text-slate-600 pl-5">{folderName}</div>
          </div>
        </div>
      </Modal>}
    </div>
  );
}