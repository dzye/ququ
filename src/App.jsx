import React, { useState, useEffect, useRef, useCallback } from "react";
import "./index.css";
import { toast } from "sonner";
import { LoadingDots } from "./components/ui/loading-dots";
import { useHotkey } from "./hooks/useHotkey";
import { useWindowDrag } from "./hooks/useWindowDrag";
import { useRecording } from "./hooks/useRecording";
import { useTextProcessing } from "./hooks/useTextProcessing";
import { useModelStatus } from "./hooks/useModelStatus";
import {
  AudioLines,
  CheckCircle2,
  Circle,
  ClipboardPaste,
  Cloud,
  Copy,
  Cpu,
  Download,
  History,
  Languages,
  Maximize2,
  Mic,
  MicOff,
  Minimize2,
  Minus,
  Pin,
  PinOff,
  Settings,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import SettingsPanel from "./components/SettingsPanel";
import { ModelDownloadProgress } from "./components/ui/model-status-indicator";

const SettingsPage = React.lazy(() =>
  import("./settings.jsx").then((module) => ({ default: module.SettingsPage }))
);

const statusCopy = {
  idle: { label: "待机中", tone: "idle" },
  recording: { label: "正在录音", tone: "recording" },
  processing: { label: "转录中", tone: "processing" },
  optimizing: { label: "AI 优化中", tone: "processing" },
  blocked: { label: "模型未就绪", tone: "blocked" },
};

const modelStageLabel = {
  checking: "Checking",
  need_download: "Need Models",
  downloading: "Downloading",
  loading: "Loading",
  ready: "Online",
  error: "Offline",
};

const Tooltip = ({ children, content, position = "top" }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="ququ-tooltip-wrap">
      <div onMouseEnter={() => setIsVisible(true)} onMouseLeave={() => setIsVisible(false)}>
        {children}
      </div>
      {isVisible && (
        <div className={`ququ-tooltip ququ-tooltip-${position}`}>
          {content}
        </div>
      )}
    </div>
  );
};

const BrandMark = () => (
  <div className="brand-mark" aria-hidden="true">
    <span className="brand-wing brand-wing-left" />
    <span className="brand-wing brand-wing-right" />
    <span className="brand-core" />
  </div>
);

const Waveform = ({ active = false }) => (
  <div className="waveform" aria-hidden="true">
    {Array.from({ length: 18 }).map((_, index) => (
      <span
        key={index}
        className={active ? "waveform-bar waveform-bar-active" : "waveform-bar"}
        style={{ animationDelay: `${index * 0.045}s` }}
      />
    ))}
  </div>
);

const HeaderButton = ({ icon: Icon, label, onClick, active = false, danger = false, disabled = false }) => (
  <Tooltip content={label} position="bottom">
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`header-icon-button ${active ? "header-icon-button-active" : ""} ${
        danger ? "header-icon-button-danger" : ""
      }`}
      aria-label={label}
    >
      <Icon className="h-4 w-4" strokeWidth={1.8} />
    </button>
  </Tooltip>
);

const StatusPill = ({ state }) => {
  const copy = statusCopy[state] || statusCopy.idle;

  return (
    <div className={`status-pill status-pill-${copy.tone}`}>
      <span className="status-orb" />
      <span>{copy.label}</span>
    </div>
  );
};

const AppHeader = ({
  currentState,
  isMuted,
  isCompactMode,
  isAlwaysOnTop,
  isMaximized,
  isElectronEnv,
  dragHandlers,
  onHistory,
  onSettings,
  onToggleMute,
  onToggleCompact,
  onMinimize,
  onToggleMaximize,
  onClose,
  onToggleAlwaysOnTop,
}) => (
  <header className="app-header draggable" {...dragHandlers}>
    <div className="brand-cluster">
      <BrandMark />
      <div className="brand-copy">
        <div className="brand-title">蝴蝶 Speech</div>
        <div className="brand-subtitle">实时语音转录助手</div>
      </div>
    </div>

    <div className="header-status">
      <StatusPill state={currentState} />
    </div>

    <div className="header-actions non-draggable">
      <HeaderButton icon={History} label="历史记录" onClick={onHistory} />
      <HeaderButton icon={Settings} label="设置" onClick={onSettings} />
      <HeaderButton
        icon={isMuted ? VolumeX : Volume2}
        label={isMuted ? "取消静音" : "静音"}
        onClick={onToggleMute}
        active={isMuted}
      />
      <HeaderButton
        icon={AudioLines}
        label={isCompactMode ? "退出小窗模式" : "小窗模式"}
        onClick={onToggleCompact}
        active={isCompactMode}
      />
      {isElectronEnv && (
        <>
          <span className="toolbar-divider" />
          <HeaderButton
            icon={isAlwaysOnTop ? Pin : PinOff}
            label={isAlwaysOnTop ? "取消窗口置顶" : "窗口置顶"}
            onClick={onToggleAlwaysOnTop}
            active={isAlwaysOnTop}
          />
          <HeaderButton icon={Minus} label="最小化" onClick={onMinimize} />
          <HeaderButton
            icon={isMaximized ? Minimize2 : Maximize2}
            label={isMaximized ? "退出全屏" : "全屏"}
            onClick={onToggleMaximize}
          />
          <HeaderButton icon={X} label="关闭" onClick={onClose} danger />
        </>
      )}
    </div>
  </header>
);

const formatHotkeyParts = (hotkey) =>
  hotkey
    .replaceAll(" + ", "+")
    .split("+")
    .map((part) => part.trim())
    .filter(Boolean);

const ShortcutHint = ({ hotkey }) => (
  <div className="shortcut-card">
    <div className="shortcut-keys" aria-label={hotkey}>
      {formatHotkeyParts(hotkey).map((part, index, parts) => (
        <React.Fragment key={`${part}-${index}`}>
          <kbd>{part}</kbd>
          {index < parts.length - 1 && <span className="shortcut-plus">+</span>}
        </React.Fragment>
      ))}
    </div>
    <div className="shortcut-copy">Quick Start Recording</div>
  </div>
);

const RecordingButton = ({ state, disabled, isMuted, isHovered, onClick, onMouseEnter, onMouseLeave }) => {
  const isLive = state === "recording" || state === "processing" || state === "optimizing";

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      disabled={disabled}
      className={`record-button non-draggable ${isLive ? "record-button-live" : ""} ${
        isHovered ? "record-button-hovered" : ""
      } ${disabled ? "record-button-disabled" : ""}`}
      aria-label={isLive ? "停止录音" : "开始录音"}
    >
      <span className="record-ripple record-ripple-one" />
      <span className="record-ripple record-ripple-two" />
      <span className="record-glow" />
      <span className="record-button-core">
        {isMuted ? (
          <MicOff className="h-12 w-12" strokeWidth={1.7} />
        ) : state === "processing" || state === "optimizing" ? (
          <AudioLines className="h-12 w-12" strokeWidth={1.7} />
        ) : (
          <Mic className="h-12 w-12" strokeWidth={1.7} />
        )}
      </span>
    </button>
  );
};

const getModelMessage = (modelStatus) => {
  if (modelStatus.stage === "need_download") return "需要下载 AI 模型文件才能开始使用";
  if (modelStatus.stage === "downloading") return `正在下载模型文件 ${modelStatus.downloadProgress || 0}%`;
  if (modelStatus.stage === "loading") return "模型加载中，请稍候";
  if (modelStatus.stage === "error") return modelStatus.error || "模型服务暂不可用";
  if (!modelStatus.isReady) return "模型未就绪，请稍候";
  return "准备捕捉你的声音";
};

const RecordingStage = ({
  state,
  modelStatus,
  hotkey,
  isMuted,
  isHovered,
  disabled,
  onToggleRecording,
  onHoverStart,
  onHoverEnd,
}) => {
  const isWaveLive = state === "recording" || state === "processing" || state === "optimizing";
  const headline =
    state === "recording"
      ? "正在聆听"
      : state === "processing"
        ? "正在转录"
        : state === "optimizing"
          ? "正在润色文本"
          : "Ready for Dictation";

  return (
    <section className="recording-stage">
      <div className="stage-halo" aria-hidden="true" />
      <div className="stage-copy">
        <p className="stage-eyebrow">Speech to Text</p>
        <h1>{headline}</h1>
        <p>{getModelMessage(modelStatus)}</p>
      </div>

      <div className="record-button-wrap">
        <RecordingButton
          state={state}
          disabled={disabled}
          isMuted={isMuted}
          isHovered={isHovered}
          onClick={onToggleRecording}
          onMouseEnter={onHoverStart}
          onMouseLeave={onHoverEnd}
        />
      </div>

      <Waveform active={isWaveLive} />
      <ShortcutHint hotkey={hotkey} />
    </section>
  );
};

const CompactRecordingView = ({
  state,
  isMuted,
  isHovered,
  disabled,
  dragHandlers,
  onToggleRecording,
  onHoverStart,
  onHoverEnd,
  onExitCompact,
  onClose,
}) => {
  const isWaveLive = state === "recording" || state === "processing" || state === "optimizing";

  return (
    <div className="compact-window draggable" {...dragHandlers}>
      <div className="compact-topbar non-draggable">
        <StatusPill state={state} />
        <div className="compact-actions">
          <HeaderButton icon={Maximize2} label="退出小窗模式" onClick={onExitCompact} />
          <HeaderButton icon={X} label="隐藏窗口" onClick={onClose} danger />
        </div>
      </div>

      <div className="compact-center non-draggable">
        <RecordingButton
          state={state}
          disabled={disabled}
          isMuted={isMuted}
          isHovered={isHovered}
          onClick={onToggleRecording}
          onMouseEnter={onHoverStart}
          onMouseLeave={onHoverEnd}
        />
        <Waveform active={isWaveLive} />
      </div>
    </div>
  );
};

const EmptyTranscript = () => (
  <div className="transcript-empty">
    <Sparkles className="h-5 w-5" strokeWidth={1.7} />
    <div>
      <p>转录内容会在这里实时出现</p>
      <span>完成录音后，原始识别与 AI 优化结果会自动汇入此处。</span>
    </div>
  </div>
);

const TranscriptPanel = ({ originalText, processedText, isProcessing, onCopy, onExport, onPaste, scrollRef }) => {
  const hasContent = Boolean(originalText || processedText || isProcessing);

  return (
    <section className="transcript-panel">
      <div className="panel-header">
        <div>
          <p className="panel-kicker">Live Transcript</p>
          <h2>实时转录</h2>
        </div>
        <div className="panel-actions">
          {processedText && (
            <>
              <HeaderButton icon={ClipboardPaste} label="粘贴优化文本" onClick={() => onPaste(processedText)} />
              <HeaderButton icon={Copy} label="复制优化文本" onClick={() => onCopy(processedText)} />
              <HeaderButton icon={Download} label="导出文本" onClick={() => onExport(processedText)} />
            </>
          )}
        </div>
      </div>

      <div ref={scrollRef} className="transcript-scroll custom-scrollbar">
        {!hasContent ? (
          <EmptyTranscript />
        ) : (
          <div className="transcript-stack">
            {originalText && (
              <article className="transcript-bubble transcript-bubble-raw">
                <div className="bubble-meta">
                  <span>Raw Recognition</span>
                  <button type="button" onClick={() => onCopy(originalText)} aria-label="复制识别文本">
                    <Copy className="h-3.5 w-3.5" strokeWidth={1.8} />
                  </button>
                </div>
                <p>{originalText}</p>
              </article>
            )}

            {(processedText || isProcessing) && (
              <article className="transcript-bubble transcript-bubble-ai">
                <div className="bubble-meta">
                  <span>AI Refined</span>
                  <Sparkles className="h-3.5 w-3.5" strokeWidth={1.8} />
                </div>
                {isProcessing ? (
                  <div className="processing-line">
                    <LoadingDots />
                    <span>正在生成更自然的表达...</span>
                  </div>
                ) : (
                  <p>{processedText}</p>
                )}
              </article>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

const StatusItem = ({ icon: Icon, label, value, tone = "neutral" }) => (
  <div className={`status-item status-item-${tone}`}>
    <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
    <span className="status-item-label">{label}</span>
    <strong>{value}</strong>
  </div>
);

const FooterStatus = ({ modelStatus, isMuted, microphoneName, systemLanguage }) => {
  const modelTone = modelStatus.stage === "ready" ? "online" : modelStatus.stage === "error" ? "danger" : "neutral";

  return (
    <footer className="footer-status">
      <StatusItem icon={isMuted ? MicOff : Mic} label="Mic" value={isMuted ? "Muted" : microphoneName} />
      <StatusItem icon={Languages} label="System" value={systemLanguage} />
      <StatusItem icon={AudioLines} label="Transcript" value="Mandarin" />
      <StatusItem icon={modelStatus.stage === "ready" ? CheckCircle2 : Circle} label="AI Model" value={modelStageLabel[modelStatus.stage] || "Unknown"} tone={modelTone} />
      <StatusItem icon={modelStatus.stage === "ready" ? Cpu : Cloud} label="Mode" value={modelStatus.stage === "ready" ? "Local" : "Hybrid"} />
    </footer>
  );
};

export default function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const page = urlParams.get("page");

  if (page === "settings") {
    return (
      <React.Suspense
        fallback={
          <div className="min-h-screen bg-[#f4f0e8] flex items-center justify-center">
            <div className="flex items-center gap-3 text-stone-700">
              <LoadingDots />
              <span>加载设置页面...</span>
            </div>
          </div>
        }
      >
        <SettingsPage />
      </React.Suspense>
    );
  }

  const [isHovered, setIsHovered] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCompactMode, setIsCompactMode] = useState(false);
  const [originalText, setOriginalText] = useState("");
  const [processedText, setProcessedText] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [microphoneName, setMicrophoneName] = useState("Default Microphone");
  const [windowState, setWindowState] = useState({
    isMaximized: false,
    isAlwaysOnTop: false,
  });

  const transcriptRef = useRef(null);
  const { handleMouseDown, handleMouseMove, handleMouseUp, handleClick } = useWindowDrag();
  const modelStatus = useModelStatus();

  const {
    isRecording,
    isProcessing: isRecordingProcessing,
    isOptimizing,
    startRecording,
    stopRecording,
    error: recordingError,
  } = useRecording();

  const { isProcessing: isTextProcessing, error: textProcessingError } = useTextProcessing();

  const lastPasteRef = useRef({ text: "", timestamp: 0 });
  const PASTE_DEBOUNCE_TIME = 1000;

  const safePaste = useCallback(async (text) => {
    const now = Date.now();
    const lastPaste = lastPasteRef.current;

    if (lastPaste.text === text && now - lastPaste.timestamp < PASTE_DEBOUNCE_TIME) {
      return;
    }

    lastPasteRef.current = { text, timestamp: now };

    try {
      if (window.electronAPI) {
        await window.electronAPI.pasteText(text);
        toast.success("文本已自动粘贴到当前输入框");
      } else {
        await navigator.clipboard.writeText(text);
        toast.info("文本已复制到剪贴板，请手动粘贴");
      }
    } catch (error) {
      toast.error("粘贴失败", {
        description: "请检查辅助功能权限。文本已复制到剪贴板，请手动粘贴。",
      });
    }
  }, []);

  const handleRecordingComplete = useCallback((transcriptionResult) => {
    if (transcriptionResult.success && transcriptionResult.text) {
      setOriginalText(transcriptionResult.text);
      setProcessedText("");
      toast.success("语音识别完成，AI 正在优化文本...");
    }
  }, []);

  const handleAIOptimizationComplete = useCallback(
    async (optimizedResult) => {
      if (optimizedResult.success && optimizedResult.enhanced_by_ai && optimizedResult.text) {
        setProcessedText(optimizedResult.text);
        await safePaste(optimizedResult.text);
        toast.success("AI 文本优化完成并已自动粘贴");
      } else if (originalText) {
        await safePaste(originalText);
        toast.info("AI 优化失败，已粘贴原始识别文本");
      }
    },
    [safePaste, originalText]
  );

  useEffect(() => {
    window.onTranscriptionComplete = handleRecordingComplete;
    window.onAIOptimizationComplete = handleAIOptimizationComplete;

    return () => {
      window.onTranscriptionComplete = null;
      window.onAIOptimizationComplete = null;
    };
  }, [handleRecordingComplete, handleAIOptimizationComplete]);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [originalText, processedText, isTextProcessing, isOptimizing]);

  useEffect(() => {
    const loadMicrophoneName = async () => {
      try {
        if (!navigator.mediaDevices?.enumerateDevices) return;
        const devices = await navigator.mediaDevices.enumerateDevices();
        const microphone = devices.find((device) => device.kind === "audioinput");
        if (microphone?.label) {
          setMicrophoneName(microphone.label);
        }
      } catch (error) {
        console.error("读取麦克风设备失败:", error);
      }
    };

    loadMicrophoneName();
    navigator.mediaDevices?.addEventListener?.("devicechange", loadMicrophoneName);
    return () => navigator.mediaDevices?.removeEventListener?.("devicechange", loadMicrophoneName);
  }, []);

  const handleCopyText = async (text) => {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.copyText(text);
        if (!result.success) throw new Error(result.error || "复制失败");
      } else {
        await navigator.clipboard.writeText(text);
      }
      toast.success("文本已复制到剪贴板");
    } catch (error) {
      toast.error(`无法复制文本到剪贴板: ${error.message}`);
    }
  };

  const handleExportText = async (text) => {
    try {
      if (window.electronAPI) {
        await window.electronAPI.exportTranscriptions("txt");
        toast.success("文本已导出到文件");
      } else {
        const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `蝴蝶Speech转录_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.txt`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      toast.error("无法导出文本文件");
    }
  };

  const handleDownloadModels = useCallback(async () => {
    try {
      toast.info("开始下载模型文件...");
      const result = await modelStatus.downloadModels();
      if (result.success) {
        toast.success("模型下载完成，正在加载...");
      } else {
        toast.error(`模型下载失败: ${result.error}`);
      }
    } catch (error) {
      toast.error(`模型下载失败: ${error.message}`);
    }
  }, [modelStatus]);

  const getMicState = () => {
    if (!modelStatus.isReady && modelStatus.stage !== "ready") return "blocked";
    if (isRecording) return "recording";
    if (isRecordingProcessing) return "processing";
    if (isOptimizing) return "optimizing";
    return "idle";
  };

  const micState = getMicState();
  const isBusy = isRecordingProcessing || isOptimizing;
  const isMicDisabled = isBusy || (isMuted && !isRecording) || (!modelStatus.isReady && !isRecording);
  const isElectronEnv = Boolean(window.electronAPI);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
      return;
    }

    if (isMuted) {
      toast.warning("麦克风已静音");
      return;
    }

    if (modelStatus.stage === "need_download") {
      toast.warning("请先下载 AI 模型文件");
      return;
    }

    if (modelStatus.stage === "downloading") {
      toast.warning("模型正在下载中，请稍候...");
      return;
    }

    if (modelStatus.stage === "loading") {
      toast.warning("模型正在加载中，请稍候...");
      return;
    }

    if (modelStatus.stage === "error") {
      toast.error(`模型错误: ${modelStatus.error}`);
      return;
    }

    if (!modelStatus.isReady) {
      toast.warning("模型未就绪，请稍候...");
      return;
    }

    if (!isRecordingProcessing) {
      startRecording();
    }
  }, [isMuted, modelStatus, isRecording, isRecordingProcessing, startRecording, stopRecording]);

  const { hotkey, syncRecordingState, registerHotkey } = useHotkey();

  useEffect(() => {
    const isControlPanel = new URLSearchParams(window.location.search).get("panel") === "control";
    if (isControlPanel) return;

    const initializeHotkey = async () => {
      try {
        await registerHotkey("CommandOrControl+Shift+Space");
      } catch (error) {
        console.error("主窗口热键注册异常:", error);
      }
    };

    if (registerHotkey) initializeHotkey();
  }, [registerHotkey]);

  const handleClose = () => {
    if (window.electronAPI) window.electronAPI.hideWindow();
  };

  const handleMinimizeWindow = () => {
    if (window.electronAPI) window.electronAPI.minimizeWindow();
  };

  const refreshWindowState = useCallback(async () => {
    if (!window.electronAPI?.getWindowState) return;

    try {
      const state = await window.electronAPI.getWindowState();
      if (state) {
        setWindowState({
          isMaximized: Boolean(state.isMaximized),
          isAlwaysOnTop: Boolean(state.isAlwaysOnTop),
        });
      }
    } catch (error) {
      console.error("获取窗口状态失败:", error);
    }
  }, []);

  const handleToggleMaximizeWindow = async () => {
    if (!window.electronAPI?.toggleMaximizeWindow) return;

    try {
      const state = await window.electronAPI.toggleMaximizeWindow();
      if (state) {
        setWindowState({
          isMaximized: Boolean(state.isMaximized),
          isAlwaysOnTop: Boolean(state.isAlwaysOnTop),
        });
      }
    } catch (error) {
      console.error("切换最大化失败:", error);
    }
  };

  const handleToggleAlwaysOnTop = async () => {
    if (!window.electronAPI?.toggleAlwaysOnTopWindow) return;

    try {
      const state = await window.electronAPI.toggleAlwaysOnTopWindow();
      if (state) {
        setWindowState({
          isMaximized: Boolean(state.isMaximized),
          isAlwaysOnTop: Boolean(state.isAlwaysOnTop),
        });
      }
    } catch (error) {
      console.error("切换置顶状态失败:", error);
    }
  };

  const handleToggleCompactMode = async () => {
    const nextValue = !isCompactMode;
    setIsCompactMode(nextValue);

    try {
      if (window.electronAPI?.setMainWindowCompactMode) {
        await window.electronAPI.setMainWindowCompactMode(nextValue);
      }
    } catch (error) {
      console.error("切换小窗模式失败:", error);
    }
  };

  const handleOpenSettings = () => {
    if (window.electronAPI) {
      window.electronAPI.openSettingsWindow();
    } else {
      setShowSettings(true);
    }
  };

  const handleOpenHistory = () => {
    if (window.electronAPI) window.electronAPI.openHistoryWindow();
  };

  useEffect(() => {
    if (!window.electronAPI) return undefined;

    const unsubscribeHotkey = window.electronAPI.onHotkeyTriggered(() => {
      toggleRecording();
    });

    const unsubscribeToggle = window.electronAPI.onToggleDictation(() => {
      toggleRecording();
    });

    return () => {
      if (unsubscribeHotkey) unsubscribeHotkey();
      if (unsubscribeToggle) unsubscribeToggle();
    };
  }, [toggleRecording]);

  useEffect(() => {
    if (syncRecordingState) syncRecordingState(isRecording);
  }, [isRecording, syncRecordingState]);

  useEffect(() => {
    refreshWindowState();

    const handleWindowFocus = () => refreshWindowState();
    window.addEventListener("focus", handleWindowFocus);
    return () => window.removeEventListener("focus", handleWindowFocus);
  }, [refreshWindowState]);

  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key === "Escape") handleClose();
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, []);

  useEffect(() => {
    if (recordingError) toast.error(recordingError);
  }, [recordingError]);

  useEffect(() => {
    if (textProcessingError) toast.error(textProcessingError);
  }, [textProcessingError]);

  const handleRecordButtonClick = (event) => {
    if (handleClick(event) && !isBusy) {
      toggleRecording();
    }
  };

  const dragHandlers = { onMouseDown: handleMouseDown, onMouseMove: handleMouseMove, onMouseUp: handleMouseUp };

  if (isCompactMode) {
    return (
      <div className="ququ-app-shell ququ-app-shell-compact">
        <CompactRecordingView
          state={micState}
          isMuted={isMuted}
          isHovered={isHovered}
          disabled={isMicDisabled}
          dragHandlers={dragHandlers}
          onToggleRecording={handleRecordButtonClick}
          onHoverStart={() => {
            if (!isMicDisabled) setIsHovered(true);
          }}
          onHoverEnd={() => setIsHovered(false)}
          onExitCompact={handleToggleCompactMode}
          onClose={handleClose}
        />
      </div>
    );
  }

  return (
    <div className="ququ-app-shell">
      <div className="app-ambient" aria-hidden="true" />
      <div className="app-noise" aria-hidden="true" />

      <div className="ququ-window">
        <AppHeader
          currentState={micState}
          isMuted={isMuted}
          isCompactMode={isCompactMode}
          isAlwaysOnTop={windowState.isAlwaysOnTop}
          isMaximized={windowState.isMaximized}
          isElectronEnv={isElectronEnv}
          dragHandlers={dragHandlers}
          onHistory={handleOpenHistory}
          onSettings={handleOpenSettings}
          onToggleMute={() => setIsMuted((value) => !value)}
          onToggleCompact={handleToggleCompactMode}
          onMinimize={handleMinimizeWindow}
          onToggleMaximize={handleToggleMaximizeWindow}
          onClose={handleClose}
          onToggleAlwaysOnTop={handleToggleAlwaysOnTop}
        />

        <main className="app-main-grid">
          <RecordingStage
            state={micState}
            modelStatus={modelStatus}
            hotkey={hotkey}
            isMuted={isMuted}
            isHovered={isHovered}
            disabled={isMicDisabled}
            onToggleRecording={handleRecordButtonClick}
            onHoverStart={() => {
              if (!isMicDisabled) setIsHovered(true);
            }}
            onHoverEnd={() => setIsHovered(false)}
          />

          <TranscriptPanel
            originalText={originalText}
            processedText={processedText}
            isProcessing={isTextProcessing || isOptimizing}
            onCopy={handleCopyText}
            onExport={handleExportText}
            onPaste={safePaste}
            scrollRef={transcriptRef}
          />
        </main>

        {(modelStatus.stage === "need_download" || modelStatus.stage === "downloading") && (
          <div className="model-download-dock">
            <ModelDownloadProgress modelStatus={modelStatus} onDownload={handleDownloadModels} />
          </div>
        )}

        <FooterStatus
          modelStatus={modelStatus}
          isMuted={isMuted}
          microphoneName={microphoneName}
          systemLanguage={navigator.language || "zh-CN"}
        />
      </div>

      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  );
}
