import React from "react";
import { createRoot } from "react-dom/client";
import { Toaster, toast } from "sonner";
import "./index.css";
import {
  Calendar,
  Copy,
  Download,
  FileText,
  History,
  Loader2,
  Maximize2,
  Minus,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

const WindowButton = ({ icon: Icon, label, onClick, danger = false }) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    onClick={onClick}
    className={`header-icon-button ${danger ? "header-icon-button-danger" : ""}`}
  >
    <Icon className="h-4 w-4" strokeWidth={1.8} />
  </button>
);

const HistoryPage = () => {
  const handleClose = () => {
    window.electronAPI?.closeHistoryWindow?.();
  };

  return (
    <div className="ququ-app-shell page-shell">
      <div className="app-ambient" aria-hidden="true" />
      <div className="app-noise" aria-hidden="true" />
      <div className="page-window">
        <header className="page-titlebar draggable">
          <div className="brand-cluster">
            <div className="page-icon">
              <History className="h-5 w-5" strokeWidth={1.8} />
            </div>
            <div className="brand-copy">
              <div className="brand-title">转录历史</div>
              <div className="brand-subtitle">搜索、复制与导出过往语音内容</div>
            </div>
          </div>

          <div className="header-actions non-draggable">
            <WindowButton icon={Minus} label="最小化" onClick={() => window.electronAPI?.minimizeCurrentWindow?.()} />
            <WindowButton icon={Maximize2} label="全屏" onClick={() => window.electronAPI?.toggleMaximizeCurrentWindow?.()} />
            <WindowButton icon={X} label="关闭" onClick={handleClose} danger />
          </div>
        </header>

        <HistoryContent />
      </div>
      <Toaster />
    </div>
  );
};

const HistoryContent = () => {
  const [transcriptions, setTranscriptions] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  const filteredTranscriptions = React.useMemo(() => {
    if (!searchQuery.trim()) return transcriptions;
    const normalized = searchQuery.toLowerCase();
    return transcriptions.filter((item) =>
      item.text?.toLowerCase().includes(normalized) ||
      item.processed_text?.toLowerCase().includes(normalized) ||
      item.raw_text?.toLowerCase().includes(normalized)
    );
  }, [searchQuery, transcriptions]);

  const loadTranscriptions = async () => {
    if (!window.electronAPI) return;

    setLoading(true);
    try {
      const result = await window.electronAPI.getTranscriptions(100, 0);
      setTranscriptions(result || []);
    } catch (error) {
      toast.error("加载历史记录失败");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadTranscriptions();
  }, []);

  const handleCopy = async (text) => {
    try {
      if (window.electronAPI) {
        await window.electronAPI.copyText(text);
      } else {
        await navigator.clipboard.writeText(text);
      }
      toast.success("文本已复制到剪贴板");
    } catch (error) {
      toast.error("复制失败");
    }
  };

  const handleDelete = async (id) => {
    if (!window.electronAPI) return;

    try {
      await window.electronAPI.deleteTranscription(id);
      setTranscriptions((prev) => prev.filter((item) => item.id !== id));
      toast.success("记录已删除");
    } catch (error) {
      toast.error("删除记录失败");
    }
  };

  const handleExport = () => {
    window.electronAPI?.exportTranscriptions?.("txt");
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.ceil(Math.abs(now - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return `今天 ${date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`;
    if (diffDays === 2) return `昨天 ${date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`;
    if (diffDays <= 7) return `${diffDays - 1} 天前`;
    return date.toLocaleDateString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <main className="history-layout">
      <section className="history-toolbar">
        <div className="history-search">
          <Search className="h-4 w-4" strokeWidth={1.8} />
          <input
            type="text"
            placeholder="搜索转录内容..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>

        <div className="history-summary">
          <span>{filteredTranscriptions.length} 条记录</span>
          <button type="button" className="secondary-command" onClick={handleExport}>
            <Download className="h-4 w-4" />
            <span>导出全部</span>
          </button>
        </div>
      </section>

      <section className="history-content custom-scrollbar">
        {loading ? (
          <div className="page-loading">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>加载中...</span>
          </div>
        ) : filteredTranscriptions.length === 0 ? (
          <div className="history-empty">
            <FileText className="h-10 w-10" strokeWidth={1.5} />
            <strong>{searchQuery ? "没有找到匹配的记录" : "暂无转录历史"}</strong>
            <span>完成一次语音转录后，内容会自动出现在这里。</span>
          </div>
        ) : (
          <div className="history-list">
            {filteredTranscriptions.map((item) => (
              <article key={item.id} className="history-card">
                <div className="history-card-top">
                  <div className="history-meta">
                    <Calendar className="h-4 w-4" strokeWidth={1.8} />
                    <span>{formatDate(item.created_at)}</span>
                    {item.confidence && <em>{Math.round(item.confidence * 100)}%</em>}
                  </div>
                  <div className="history-card-actions">
                    <button type="button" onClick={() => handleCopy(item.processed_text || item.text)} title="复制文本">
                      <Copy className="h-4 w-4" strokeWidth={1.8} />
                    </button>
                    <button type="button" onClick={() => handleDelete(item.id)} title="删除记录" className="danger-action">
                      <Trash2 className="h-4 w-4" strokeWidth={1.8} />
                    </button>
                  </div>
                </div>

                <div className="history-result-block">
                  <span>Final</span>
                  <p>{item.text}</p>
                </div>

                {item.processed_text && item.processed_text.trim() !== (item.raw_text || "").trim() && (
                  <div className="history-result-block history-result-ai">
                    <span><Sparkles className="h-3.5 w-3.5" /> AI Refined</span>
                    <p>{item.processed_text}</p>
                  </div>
                )}

                {item.raw_text && item.raw_text.trim() !== item.text.trim() && (
                  <div className="history-result-block history-result-raw">
                    <span>Raw</span>
                    <p>{item.raw_text}</p>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
};

const container = document.getElementById("history-root");
const root = createRoot(container);
root.render(<HistoryPage />);
