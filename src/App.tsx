import { useState, useEffect } from 'react';
import { 
  SlidersHorizontal, Image as ImageIcon,
  LayoutGrid, Star, ImagePlus, Sparkles, FileText, Search as SearchIcon, Settings
} from 'lucide-react';
import HeaderInfo from './components/HeaderInfo';
import ControlTab from './components/ControlTab';
import SettingsTab from './components/SettingsTab';
import { I18nProvider, useT } from './i18n';

export const GOOGLE_FLOW_URL = 'https://labs.google/fx/tools/flow';

// Type untuk item dalam queue
export interface QueueItem {
  index: number;
  text: string;
  status: 'queued' | 'processing' | 'done' | 'waiting' | 'error';
  inputFound?: boolean;
  buttonFound?: boolean;
}

// Custom hook untuk menyimpan state ke localStorage
function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue] as const;
}

export default function App() {
  const [language, setLanguage] = useLocalStorage('veo_language', 'English');
  return (
    <I18nProvider language={language}>
      <AppShell language={language} setLanguage={setLanguage} />
    </I18nProvider>
  );
}

function AppShell({ language, setLanguage }: { language: string; setLanguage: (v: string) => void }) {
  const t = useT();
  const [activeTab, setActiveTab] = useLocalStorage('veo_activeTab', 'Control');
  const [activeMode, setActiveMode] = useLocalStorage('veo_activeMode', 'Text to Image');
  const [promptsText, setPromptsText] = useLocalStorage('veo_promptsText', "");
  const [delay, setDelay] = useLocalStorage('veo_delay', 20);
  const [autoChangeFileName, setAutoChangeFileName] = useLocalStorage('veo_autoChangeFileName', true);
  const [autoAddCharacter, setAutoAddCharacter] = useLocalStorage('veo_autoAddCharacter', false);
  const [outputsPerPrompt, setOutputsPerPrompt] = useLocalStorage('veo_outputsPerPrompt', 1);

  // Queue state untuk progres real-time (Tidak perlu disimpan di local storage)
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  // Settings State
  const [defaultMode, setDefaultMode] = useLocalStorage('veo_defaultMode', 'Text to Image');
  const [videoModel, setVideoModel] = useLocalStorage('veo_videoModel', 'Veo 3.1 - Lite');
  const [imageModel, setImageModel] = useLocalStorage('veo_imageModel', '🍌 Nano Banana Pro');
  const [aspectRatio, setAspectRatio] = useLocalStorage('veo_aspectRatio', '16:9 (YouTube)');
  const [videoOption, setVideoOption] = useLocalStorage('veo_videoOption', '8 seconds');
  const [imageModeOption, setImageModeOption] = useLocalStorage('veo_imageModeOption', 'New Image');
  const [maxRetries, setMaxRetries] = useLocalStorage('veo_maxRetries', 1);
  const [autoDownloadVideo, setAutoDownloadVideo] = useLocalStorage('veo_autoDownloadVideo', '720p');
  const [autoDownloadImage, setAutoDownloadImage] = useLocalStorage('veo_autoDownloadImage', '2k');
  const [autoDownloadEnabled, setAutoDownloadEnabled] = useLocalStorage('veo_autoDownloadEnabled', true);
  const [folderName, setFolderName] = useLocalStorage('veo_folderName', 'veo-folder-1');
  const [concurrency, setConcurrency] = useLocalStorage('veo_concurrency', 1);
  const [randomDelayMin, setRandomDelayMin] = useLocalStorage('veo_randomDelayMin', 0);

  // Mendengarkan pesan progres dari content.js via background.js
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      const listener = (message: any) => {
        if (message.action !== 'progress_update') return;

        switch (message.type) {
          case 'batch_start':
            setIsRunning(true);
            setQueueItems(
              message.prompts.map((p: any) => ({
                index: p.index,
                text: p.text,
                status: 'queued' as const
              }))
            );
            break;

          case 'prompt_processing':
            setQueueItems(prev =>
              prev.map(item =>
                item.index === message.index
                  ? { ...item, status: 'processing' as const }
                  : item
              )
            );
            break;

          case 'prompt_done':
            setQueueItems(prev =>
              prev.map(item =>
                item.index === message.index
                  ? {
                      ...item,
                      status: 'done' as const,
                      inputFound: message.inputFound,
                      buttonFound: message.buttonFound
                    }
                  : item
              )
            );
            break;

          case 'prompt_waiting':
            setQueueItems(prev =>
              prev.map(item =>
                item.index === message.index
                  ? { ...item, status: 'waiting' as const }
                  : item
              )
            );
            break;

          case 'batch_complete':
            setIsRunning(false);
            break;
        }
      };

      chrome.runtime.onMessage.addListener(listener);
      return () => chrome.runtime.onMessage.removeListener(listener);
    }
  }, []);

  const handleResetDefaults = () => {
    setDefaultMode('Text to Image');
    setVideoModel('Veo 3.1 - Lite');
    setImageModel('🍌 Nano Banana Pro');
    setAspectRatio('16:9 (YouTube)');
    setVideoOption('8 seconds');
    setImageModeOption('New Image');
    setOutputsPerPrompt(1);
    setMaxRetries(1);
    setAutoDownloadVideo('720p');
    setAutoDownloadImage('2k');
    setAutoDownloadEnabled(true);
    setFolderName('veo-folder-1');
    setConcurrency(1);
    setRandomDelayMin(0);
    setLanguage('English');
  };

  const modes = [
    { id: 'Text to Video', icon: FileText, tKey: 'mode_ttv' },
    { id: 'Frame to Video', icon: ImagePlus, tKey: 'mode_ftv' },
    { id: 'Ingredients to Video', icon: LayoutGrid, tKey: 'mode_itv' },
    { id: 'Text to Image', icon: Star, tKey: 'mode_t2i' },
    { id: 'Image to Image', icon: ImageIcon, tKey: 'mode_i2i' },
    { id: 'Agent Automation', icon: Sparkles, tKey: 'mode_agent' },
  ];

  const handleStartAutomation = () => {
    const promptList = promptsText.split('\n').filter(p => p.trim() !== '');
    if (promptList.length === 0) {
      alert(t('alert_no_prompt'));
      return;
    }

    // Set queue awal di UI sebelum pesan dikirim
    setQueueItems(promptList.map((text, i) => ({ index: i, text, status: 'queued' as const })));
    setIsRunning(true);

    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        const tabId = tabs[0]?.id;
        if (tabId) {
          const payload = {
            action: 'start_batch',
            prompts: promptList,
            delay: delay,
            mode: activeMode,  // "Text to Image", "Text to Video", etc.
            settings: {
              videoModel,
              imageModel,
              aspectRatio,
              videoOption,
              imageModeOption,
              outputsPerPrompt,
              maxRetries,
              autoDownloadVideo: autoDownloadEnabled ? autoDownloadVideo : 'No Download',
              autoDownloadImage: autoDownloadEnabled ? autoDownloadImage : 'No Download',
              folderName,
              autoChangeFileName,
              autoAddCharacter,
              concurrency,
              randomDelayMin
            }
          };
          const markRunError = (alertKey: string) => {
            setIsRunning(false);
            setQueueItems(prev => prev.map(item => ({ ...item, status: 'error' as const })));
            alert(t(alertKey));
          };
          const sendStartMessage = (onFailure: () => void) => chrome.tabs.sendMessage(tabId, payload, (response) => {
            if (chrome.runtime.lastError) {
              onFailure();
              return;
            }
            console.log('Response:', response);
          });

          // Content script umumnya sudah terpasang otomatis via manifest
          // (content_scripts matches <all_urls>); injeksi programatik hanya
          // fallback bila tab belum punya penerima pesan, agar tidak terjadi
          // injeksi ganda setiap Run ditekan.
          sendStartMessage(() => {
            chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] }, () => {
              if (chrome.runtime.lastError) {
                console.error('Flow Automation: gagal memasang content script.', chrome.runtime.lastError.message);
                markRunError('alert_unsupported_tab');
                return;
              }
              sendStartMessage(() => {
                console.error('Flow Automation: gagal menghubungi content script.');
                markRunError('alert_access_tab');
              });
            });
          });
        }
      });
    } else {
      // Dev mode: simulasi progres
      alert(`${t('dev_alert')}\nPrompts: ${promptList.length}\nDelay: ${delay}s\nAuto-download: ${autoDownloadEnabled ? `ON (Video=${autoDownloadVideo}, Image=${autoDownloadImage})` : 'OFF'}\nFolder: ${folderName}`);
      setQueueItems(promptList.map((text, i) => ({
        index: i,
        text,
        status: 'done' as const,
        inputFound: true,
        buttonFound: true
      })));
      setIsRunning(false);
    }
  };

  const handleStop = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'stop_batch' });
        }
      });
    }
    setIsRunning(false);
    // Tandai semua item yang masih queued/processing/waiting jadi error
    setQueueItems(prev => prev.map(item => 
      item.status === 'done' ? item : { ...item, status: 'error' as const }
    ));
  };

  const handleClear = () => {
    setQueueItems([]);
    setIsRunning(false);
    setPromptsText("");
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center sm:p-4 font-sans text-[13px]">
      <div className="w-full h-[100vh] sm:h-[90vh] max-w-4xl sm:max-h-[850px] sm:min-h-[650px] bg-white sm:rounded-md shadow-2xl sm:border border-slate-200 flex flex-col text-slate-700 overflow-hidden">
        
        <HeaderInfo onOpenSettings={() => setActiveTab('Setting')} />

        {/* Scrollable Body Container */}
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
          {/* Tabs Navigation */}
          <div className="flex border-b border-slate-200 shrink-0 mt-4 px-4">
            {[
              { id: 'Control', icon: SlidersHorizontal, tKey: 'tab_control' },
              { id: 'Setting', icon: Settings, tKey: 'tab_setting' },
              { id: 'Debug Logs', icon: SearchIcon, tKey: 'tab_debug_logs' }
            ].map(tab => {
              const Icon = tab.icon;
              return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 border-b-2 transition-colors cursor-pointer ${
                  activeTab === tab.id 
                    ? 'border-blue-500 text-blue-600 font-medium' 
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t(tab.tKey)}
              </button>
            )})}
          </div>

          {/* Tabs Content */}
          <div className="p-4 flex flex-col gap-4">
            {activeTab === 'Control' && (
              <ControlTab 
                activeMode={activeMode} setActiveMode={setActiveMode}
                modes={modes}
                delay={delay} setDelay={setDelay}
                promptsText={promptsText} setPromptsText={setPromptsText}
                autoAddCharacter={autoAddCharacter} setAutoAddCharacter={setAutoAddCharacter}
                autoChangeFileName={autoChangeFileName} setAutoChangeFileName={setAutoChangeFileName}
                outputsPerPrompt={outputsPerPrompt} setOutputsPerPrompt={setOutputsPerPrompt}
                folderName={folderName} setFolderName={setFolderName}
                concurrency={concurrency} setConcurrency={setConcurrency}
                randomDelayMin={randomDelayMin} setRandomDelayMin={setRandomDelayMin}
                autoDownloadEnabled={autoDownloadEnabled} setAutoDownloadEnabled={setAutoDownloadEnabled}
                autoDownloadVideo={autoDownloadVideo} autoDownloadImage={autoDownloadImage}
                handleStartAutomation={handleStartAutomation}
                handleStop={handleStop}
                handleClear={handleClear}
                queueItems={queueItems}
                isRunning={isRunning}
              />
            )}

            {activeTab === 'Setting' && (
              <SettingsTab 
                defaultMode={defaultMode} setDefaultMode={setDefaultMode}
                videoModel={videoModel} setVideoModel={setVideoModel}
                imageModel={imageModel} setImageModel={setImageModel}
                aspectRatio={aspectRatio} setAspectRatio={setAspectRatio}
                videoOption={videoOption} setVideoOption={setVideoOption}
                imageModeOption={imageModeOption} setImageModeOption={setImageModeOption}
                maxRetries={maxRetries} setMaxRetries={setMaxRetries}
                autoDownloadVideo={autoDownloadVideo} setAutoDownloadVideo={setAutoDownloadVideo}
                autoDownloadImage={autoDownloadImage} setAutoDownloadImage={setAutoDownloadImage}
                autoDownloadEnabled={autoDownloadEnabled} setAutoDownloadEnabled={setAutoDownloadEnabled}
                folderName={folderName}
                language={language} setLanguage={setLanguage}
                handleResetDefaults={handleResetDefaults}
              />
            )}

            {activeTab === 'Debug Logs' && (
              <div className="text-center text-slate-500 py-8">
                {t('debug_logs_empty')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
