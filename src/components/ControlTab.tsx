import { useRef, useState } from 'react';
import { Zap, ChevronDown, Clock, FileText, Upload, Table, User, Search as SearchIcon, List, Folder, ExternalLink, Flag, RotateCcw, Play, Loader2, CheckCircle2, AlertTriangle, Clock3, Square, Download } from 'lucide-react';
import type { QueueItem } from '../App';
import { GOOGLE_FLOW_URL } from '../App';
import { useT } from '../i18n';

// Status badge component
function StatusBadge({ status, inputFound, buttonFound }: { status: QueueItem['status']; inputFound?: boolean; buttonFound?: boolean }) {
  const t = useT();
  switch (status) {
    case 'queued':
      return <span className="text-[10px] text-slate-400 flex items-center gap-1"><Clock3 className="w-3 h-3" /> {t('status_queued')}</span>;
    case 'processing':
      return <span className="text-[10px] text-blue-600 flex items-center gap-1 font-medium"><Loader2 className="w-3 h-3 animate-spin" /> {t('status_processing')}</span>;
    case 'done':
      if (!inputFound || !buttonFound) {
        return <span className="text-[10px] text-amber-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {t('status_partial')}</span>;
      }
      return <span className="text-[10px] text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {t('status_done')}</span>;
    case 'waiting':
      return <span className="text-[10px] text-purple-600 flex items-center gap-1"><Clock3 className="w-3 h-3" /> {t('status_waiting')}</span>;
    case 'error':
      return <span className="text-[10px] text-red-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {t('status_error')}</span>;
    default:
      return null;
  }
}

export default function ControlTab({
  activeMode, setActiveMode,
  modes,
  delay, setDelay,
  promptsText, setPromptsText,
  autoAddCharacter, setAutoAddCharacter,
  autoChangeFileName, setAutoChangeFileName,
  outputsPerPrompt, setOutputsPerPrompt,
  folderName, setFolderName,
  concurrency, setConcurrency,
  randomDelayMin, setRandomDelayMin,
  autoDownloadEnabled, setAutoDownloadEnabled,
  autoDownloadVideo, autoDownloadImage,
  handleStartAutomation,
  handleStop,
  handleClear,
  queueItems = [],
  isRunning = false
}: any) {
  const t = useT();
  const doneCount = queueItems.filter((q: QueueItem) => q.status === 'done').length;
  const totalCount = queueItems.length;
  const activePromptCount = promptsText.split('\n').filter((p: string) => p.trim() !== '').length;

  const txtInputRef = useRef<HTMLInputElement>(null);
  const spreadInputRef = useRef<HTMLInputElement>(null);
  const [scannedCharacters, setScannedCharacters] = useState<string[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState('');

  const handleUploadTxt = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    setPromptsText((prev: string) => (prev.trim() ? `${prev.trim()}\n\n${text}` : text));
  };

  const handleUploadSpreadsheet = async (file: File | undefined) => {
    if (!file) return;
    const ext = file.name.toLowerCase().split('.').pop();
    if (ext === 'xlsx') {
      alert(t('unsupported_ext'));
      return;
    }
    const text = await file.text();
    const prompts = text
      .split('\n')
      .map((line: string) => line.split(',')[0].trim())
      .filter(Boolean);
    if (prompts.length === 0) return;
    const joined = prompts.join('\n\n');
    setPromptsText((prev: string) => (prev.trim() ? `${prev.trim()}\n\n${joined}` : joined));
  };

  const handleScanCharacters = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0]?.id;
        const url = tabs[0]?.url ?? '';
        if (!tabId || !url.includes('labs.google/fx/tools/flow')) {
          alert(t('scan_need_project'));
          return;
        }
        chrome.tabs.sendMessage(tabId, { action: 'scan_characters' }, (response) => {
          const characters: string[] | undefined = response?.characters;
          if (chrome.runtime.lastError || !characters || characters.length === 0) {
            alert(t('scan_need_project'));
            return;
          }
          setScannedCharacters(characters);
        });
      });
    } else {
      alert('[Dev Mode] Simulated Scan!');
      setScannedCharacters(['Simulated Character A', 'Simulated Character B']);
    }
  };

  const handleReportBug = async () => {
    const details = [
      `Mode: ${activeMode}`,
      `Prompts: ${activePromptCount}`,
      `Delay: ${delay}s`,
      `Concurrency: ${concurrency}`,
      `Outputs/Prompt: ${outputsPerPrompt}`,
      `Folder: ${folderName}`,
      `Characters scanned: ${scannedCharacters.length}`,
    ].join('\n');
    const info = `${t('bug_desc')}\n\n${details}`;
    try {
      await navigator.clipboard.writeText(info);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = info;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    alert(`${info}\n\n${t('copied')}`);
  };

  return (
    <>
      {/* Action Grid */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {modes.map((mode: any) => {
          const Icon = mode.icon;
          return (
          <button
            key={mode.id}
            onClick={() => setActiveMode(mode.id)}
            className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded border transition-colors cursor-pointer ${
              activeMode === mode.id
                ? 'bg-blue-600 border-blue-500 text-black font-semibold'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="text-[11px] text-center leading-tight">{t(mode.tKey)}</span>
          </button>
        )})}
      </div>

      {/* Config Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-slate-50 border border-slate-200 rounded p-3 flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-slate-800 font-medium">
            <Zap className="w-4 h-4" />
            {t('concurrent_prompts')}
          </div>
          <div className="relative">
            <select
              value={concurrency}
              onChange={(e) => setConcurrency(Number(e.target.value))}
              className="w-full bg-white border border-slate-200 text-slate-800 rounded px-2 py-1.5 appearance-none focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value={1}>{t('concurrent_1')}</option>
              <option value={2}>{t('concurrent_2')}</option>
            </select>
            <ChevronDown className="w-4 h-4 absolute right-2 top-2 text-slate-500 pointer-events-none" />
          </div>
          <p className="text-[10px] text-slate-500 leading-tight">{t('concurrent_desc')}</p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded p-3 flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-slate-800 font-medium">
            <Clock className="w-4 h-4" />
            {t('random_delay')}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={randomDelayMin}
              onChange={(e) => setRandomDelayMin(Number(e.target.value))}
              className="w-full bg-white border border-slate-200 text-slate-800 rounded px-2 py-1.5 text-center focus:outline-none focus:border-blue-500"
            />
            <span className="text-slate-500">⇄</span>
            <input type="number" value={delay} onChange={(e) => setDelay(Number(e.target.value))} className="w-full bg-white border border-slate-200 text-slate-800 rounded px-2 py-1.5 text-center focus:outline-none focus:border-blue-500" />
          </div>
          <p className="text-[10px] text-slate-500 leading-tight">{t('random_delay_desc')}</p>
        </div>
      </div>

      {/* Prompts Area */}
      <div className="flex flex-col gap-2 border border-slate-200 bg-slate-50 rounded p-3">
        <div className="flex gap-4 border-b border-slate-200 pb-2">
          <button className="flex items-center gap-1.5 text-slate-800 font-medium cursor-pointer">
            <FileText className="w-3.5 h-3.5" /> {t('prompts')}
          </button>
          <button onClick={() => txtInputRef.current?.click()} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-700 transition-colors cursor-pointer">
            <Upload className="w-3.5 h-3.5" /> {t('upload_txt')}
          </button>
          <button onClick={() => spreadInputRef.current?.click()} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-700 transition-colors cursor-pointer">
            <Table className="w-3.5 h-3.5" /> {t('upload_xlsx')}
          </button>
          <input
            type="file"
            accept=".txt,text/plain"
            ref={txtInputRef}
            className="hidden"
            onChange={(e) => handleUploadTxt(e.target.files?.[0] ?? undefined)}
          />
          <input
            type="file"
            accept=".xlsx,.csv"
            ref={spreadInputRef}
            className="hidden"
            onChange={(e) => handleUploadSpreadsheet(e.target.files?.[0] ?? undefined)}
          />
        </div>
        <textarea 
          className="w-full bg-white border border-slate-200 rounded p-2 text-slate-700 text-xs resize-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          rows={8}
          value={promptsText}
          onChange={(e) => setPromptsText(e.target.value)}
          placeholder={t('prompt_placeholder')}
        />
        
        {/* Google Flow Feature inner card */}
        <div className="bg-white border border-slate-200 rounded p-3 mt-1 flex flex-col gap-2">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 text-slate-800 font-medium text-xs">
                <User className="w-3.5 h-3.5" /> {t('auto_add_character')}
              </div>
              <div className="text-[10.5px] text-slate-500 pl-5">{t('auto_add_character_desc')}</div>
            </div>
            <button onClick={() => setAutoAddCharacter(!autoAddCharacter)} className={`w-8 h-4 rounded-full relative transition-colors cursor-pointer ${autoAddCharacter ? 'bg-blue-600' : 'bg-slate-300'}`}>
              <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-all shadow-sm ${autoAddCharacter ? 'right-0.5' : 'left-0.5'}`}></div>
            </button>
          </div>
          <div className="flex flex-col gap-1.5 mt-1">
            <label className="text-[11px] text-slate-800">{t('default_characters')}</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <select
                  value={selectedCharacter}
                  onChange={(e) => setSelectedCharacter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded px-2 py-1.5 appearance-none focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="">None</option>
                  {scannedCharacters.map((char) => (
                    <option key={char} value={char}>{char}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-2 top-2 text-slate-500 pointer-events-none" />
              </div>
              <button onClick={handleScanCharacters} className="flex items-center justify-center gap-1.5 text-slate-800 bg-transparent hover:bg-slate-100 px-3 py-1.5 rounded transition-colors text-xs border border-transparent cursor-pointer">
                <SearchIcon className="w-3.5 h-3.5" /> {t('scan_characters')}
              </button>
            </div>
            <div className="text-[10px] text-slate-500 italic">
              {scannedCharacters.length > 0 ? t('char_found', { n: scannedCharacters.length }) : t('no_characters_scanned')}
            </div>
          </div>
        </div>
      </div>

      {/* Outputs and Folder */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
        <div className="flex flex-col gap-1.5 border border-slate-200 bg-slate-50 p-3 rounded">
          <div className="flex items-center gap-1.5 text-slate-800 font-medium text-[11px]"><List className="w-3.5 h-3.5" /> {t('outputs_per_prompt')}</div>
          <div className="relative">
            <select
              value={outputsPerPrompt}
              onChange={(e) => setOutputsPerPrompt(Number(e.target.value))}
              className="w-full bg-white border border-slate-200 text-slate-800 rounded px-2 py-1.5 text-sm appearance-none focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
            </select>
            <ChevronDown className="w-4 h-4 absolute right-2 top-2 text-slate-500 pointer-events-none" />
          </div>
          <div className="text-[10px] text-slate-500">{t('outputs_per_prompt_desc')}</div>
        </div>
        <div className="flex flex-col gap-1.5 border border-slate-200 bg-slate-50 p-3 rounded">
          <div className="flex items-center gap-1.5 text-slate-800 font-medium text-[11px]"><Folder className="w-3.5 h-3.5" /> {t('save_to_folder')}</div>
          <input
            type="text"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            className="w-full bg-white border border-slate-200 text-slate-800 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500"
          />
          <div className="text-[10px] text-slate-500">{t('save_to_folder_desc')}</div>
        </div>
      </div>

      <div className="text-[11px] text-slate-500 mt-1">
        {t('customize_hint')}
      </div>

      {/* Toggles and Links */}
      <div className="flex flex-col gap-3 mt-1 text-[13px] text-slate-600">
        <div className="flex items-center justify-between">
          <span>{t('auto_change_file_name')}</span>
          <button onClick={() => setAutoChangeFileName(!autoChangeFileName)} className={`w-8 h-4 rounded-full relative transition-colors cursor-pointer ${autoChangeFileName ? 'bg-blue-600' : 'bg-slate-300'}`}>
            <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-all shadow-sm ${autoChangeFileName ? 'right-0.5' : 'left-0.5'}`}></div>
          </button>
        </div>
        <div className="flex items-center justify-between">
          <span>{t('remove_ai_logo')}</span>
          <a href={GOOGLE_FLOW_URL} target="_blank" rel="noopener noreferrer" className="font-bold text-slate-800 hover:underline flex items-center gap-1">
            {t('direct_to_website')} <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* PROMPT QUEUE */}
      <div className="bg-white border border-slate-200 rounded-md p-3 min-h-[160px] flex flex-col mt-2">
        <div className="flex justify-between items-center text-slate-600 mb-2 border-b border-slate-200 pb-2">
          <div className="flex items-center gap-1.5 font-bold text-[11px] tracking-wide text-slate-800">
            <List className="w-4 h-4" /> {t('prompt_queue')}
          </div>
          <div className="flex items-center gap-2">
            {isRunning && (
              <span className="text-[10px] text-blue-600 font-medium flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> {doneCount}/{totalCount}
              </span>
            )}
            <div className="text-[10px]">{queueItems.length > 0 ? t('items_count', { n: queueItems.length }) : t('active_count', { n: activePromptCount })}</div>
          </div>
        </div>

        {/* Queue Items List */}
        <div className="flex flex-col gap-1 flex-1 overflow-y-auto max-h-[300px]">
          {queueItems.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-[11px] py-6">
              {t('queue_empty')}
            </div>
          ) : (
            queueItems.map((item: QueueItem) => (
              <div
                key={item.index}
                className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded text-[11px] border transition-colors ${
                  item.status === 'processing' 
                    ? 'bg-blue-50 border-blue-200' 
                    : item.status === 'done' 
                      ? 'bg-green-50 border-green-200' 
                      : item.status === 'waiting'
                        ? 'bg-purple-50 border-purple-200'
                        : 'bg-slate-50 border-slate-100'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-slate-400 text-[10px] font-mono shrink-0">#{item.index + 1}</span>
                  <span className="text-slate-700 truncate">{item.text}</span>
                </div>
                <div className="shrink-0">
                  <StatusBadge status={item.status} inputFound={item.inputFound} buttonFound={item.buttonFound} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Auto Download Toggle */}
      <div className="flex items-center justify-between gap-3 bg-white border border-slate-200 rounded p-3">
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-1.5 text-[13px] font-medium text-slate-800">
            <Download className="w-4 h-4 text-blue-600" /> {t('auto_download')}
          </div>
          <div className="text-[10.5px] text-slate-500 leading-tight">{t('desc_auto_download')}</div>
          <div className={`text-[10.5px] font-medium ${autoDownloadEnabled ? 'text-green-600' : 'text-slate-400'}`}>
            {autoDownloadEnabled ? `${t('auto_download_on')} · ${autoDownloadVideo} / ${autoDownloadImage}` : t('auto_download_off')}
          </div>
        </div>
        <button
          onClick={() => setAutoDownloadEnabled(!autoDownloadEnabled)}
          className={`w-10 h-5 rounded-full relative transition-colors shrink-0 cursor-pointer ${autoDownloadEnabled ? 'bg-blue-600' : 'bg-slate-300'}`}
        >
          <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all shadow-sm ${autoDownloadEnabled ? 'right-0.5' : 'left-0.5'}`}></div>
        </button>
      </div>

      {/* Bottom Actions */}
      <div className="flex gap-2 mt-2 shrink-0">
        <button onClick={handleReportBug} className="flex-1 flex items-center justify-center gap-1.5 bg-transparent border border-slate-200 hover:bg-slate-100 text-slate-700 rounded py-2 transition-colors cursor-pointer font-medium">
          <Flag className="w-4 h-4" /> {t('report_bug')}
        </button>
        <button 
          onClick={handleClear}
          className="flex-1 flex items-center justify-center gap-1.5 bg-transparent border border-slate-200 hover:bg-slate-100 text-slate-700 rounded py-2 transition-colors cursor-pointer font-medium"
        >
          <RotateCcw className="w-4 h-4" /> {t('clear')}
        </button>
        {isRunning ? (
          <button onClick={handleStop} className="flex-[2] flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded py-2 transition-colors cursor-pointer text-sm">
            <Square className="w-4 h-4 fill-white" /> {t('stop')}
          </button>
        ) : (
          <button onClick={handleStartAutomation} className="flex-[2] flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded py-2 transition-colors cursor-pointer text-sm">
            <Play className="w-4 h-4 fill-white" /> {t('run')}
          </button>
        )}
      </div>
    </>
  );
}