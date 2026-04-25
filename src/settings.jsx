import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { toast, Toaster } from "sonner";
import {
  CheckCircle,
  Eye,
  EyeOff,
  Loader2,
  Maximize2,
  Mic,
  Minus,
  Save,
  Settings,
  Shield,
  TestTube,
  X,
  XCircle,
} from "lucide-react";
import { usePermissions } from "./hooks/usePermissions";
import PermissionCard from "./components/ui/permission-card";

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

const PageShell = ({ title, subtitle, icon: Icon, onClose, children }) => (
  <div className="ququ-app-shell page-shell">
    <div className="app-ambient" aria-hidden="true" />
    <div className="app-noise" aria-hidden="true" />
    <div className="page-window">
      <header className="page-titlebar draggable">
        <div className="brand-cluster">
          <div className="page-icon">
            <Icon className="h-5 w-5" strokeWidth={1.8} />
          </div>
          <div className="brand-copy">
            <div className="brand-title">{title}</div>
            <div className="brand-subtitle">{subtitle}</div>
          </div>
        </div>

        <div className="header-actions non-draggable">
          <WindowButton icon={Minus} label="最小化" onClick={() => window.electronAPI?.minimizeCurrentWindow?.()} />
          <WindowButton icon={Maximize2} label="全屏" onClick={() => window.electronAPI?.toggleMaximizeCurrentWindow?.()} />
          <WindowButton icon={X} label="关闭" onClick={onClose} danger />
        </div>
      </header>
      {children}
    </div>
  </div>
);

const Field = ({ label, hint, children }) => (
  <label className="settings-field">
    <span>{label}</span>
    {children}
    {hint && <small>{hint}</small>}
  </label>
);

const SettingsPage = () => {
  const [settings, setSettings] = useState({
    ai_api_key: "",
    ai_base_url: "https://api.openai.com/v1",
    ai_model: "gpt-3.5-turbo",
    enable_ai_optimization: true,
  });
  const [customModel, setCustomModel] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const showAlert = (alert) => {
    toast(alert.title, { description: alert.description, duration: 4000 });
  };

  const {
    micPermissionGranted,
    accessibilityPermissionGranted,
    requestMicPermission,
    testAccessibilityPermission,
  } = usePermissions(showAlert);

  const loadSettings = async () => {
    try {
      setLoading(true);
      if (window.electronAPI) {
        const allSettings = await window.electronAPI.getAllSettings();
        const loadedSettings = {
          ai_api_key: allSettings.ai_api_key || "",
          ai_base_url: allSettings.ai_base_url || "https://api.openai.com/v1",
          ai_model: allSettings.ai_model || "gpt-3.5-turbo",
          enable_ai_optimization: allSettings.enable_ai_optimization !== false,
        };
        setSettings((prev) => ({ ...prev, ...loadedSettings }));

        const predefinedModels = ["gpt-3.5-turbo", "gpt-4", "gpt-4-turbo", "gpt-4o", "gpt-4o-mini", "qwen3-30b-a3b-instruct-2507"];
        setCustomModel(!predefinedModels.includes(loadedSettings.ai_model));
      }
    } catch (error) {
      toast.error("加载设置失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleInputChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      if (window.electronAPI) {
        await window.electronAPI.setSetting("ai_api_key", settings.ai_api_key);
        await window.electronAPI.setSetting("ai_base_url", settings.ai_base_url);
        await window.electronAPI.setSetting("ai_model", settings.ai_model);
        await window.electronAPI.setSetting("enable_ai_optimization", settings.enable_ai_optimization);
        toast.success("设置保存成功");
      }
    } catch (error) {
      toast.error("保存设置失败");
    } finally {
      setSaving(false);
    }
  };

  const applyRecommendedConfig = () => {
    setSettings((prev) => ({
      ...prev,
      ai_base_url: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      ai_model: "qwen3-30b-a3b-instruct-2507",
    }));
    setCustomModel(true);
    toast.info("已应用阿里云推荐配置");
  };

  const resetToOpenAI = () => {
    setSettings((prev) => ({
      ...prev,
      ai_base_url: "https://api.openai.com/v1",
      ai_model: "gpt-3.5-turbo",
    }));
    setCustomModel(false);
    toast.info("已重置为 OpenAI 配置");
  };

  const testAIConfiguration = async () => {
    try {
      setTesting(true);
      setTestResult(null);

      if (!settings.ai_api_key.trim()) {
        setTestResult({ available: false, error: "请先输入 API 密钥", details: "API 密钥不能为空" });
        toast.error("配置不完整", { description: "请先输入 API 密钥" });
        return;
      }

      if (window.electronAPI) {
        const testConfig = {
          ai_api_key: settings.ai_api_key.trim(),
          ai_base_url: settings.ai_base_url.trim() || "https://api.openai.com/v1",
          ai_model: settings.ai_model.trim() || "gpt-3.5-turbo",
        };
        const result = await window.electronAPI.checkAIStatus(testConfig);
        setTestResult(result);

        if (result.available) {
          toast.success("AI 配置测试成功", { description: `模型: ${result.model || "未知"} - 连接正常` });
        } else {
          toast.error("AI 配置测试失败", { description: result.error || "未知错误" });
        }
      }
    } catch (error) {
      setTestResult({ available: false, error: error.message || "测试失败" });
      toast.error("测试失败", { description: error.message || "未知错误" });
    } finally {
      setTesting(false);
    }
  };

  const handleClose = () => {
    window.electronAPI?.hideSettingsWindow?.();
  };

  if (loading) {
    return (
      <PageShell title="设置" subtitle="偏好、权限与 AI 配置" icon={Settings} onClose={handleClose}>
        <div className="page-loading">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>加载设置中...</span>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title="设置" subtitle="偏好、权限与 AI 配置" icon={Settings} onClose={handleClose}>
      <main className="page-content custom-scrollbar">
        <section className="settings-grid">
          <div className="settings-card">
            <div className="settings-section-title">
              <h2>权限管理</h2>
              <p>确保录音输入与自动粘贴能力正常工作。</p>
            </div>
            <div className="settings-permission-list">
              <PermissionCard
                icon={Mic}
                title="麦克风权限"
                description="录制语音所需的权限"
                granted={micPermissionGranted}
                onRequest={requestMicPermission}
                buttonText="测试麦克风"
              />
              <PermissionCard
                icon={Shield}
                title="辅助功能权限"
                description="自动粘贴文本所需的权限"
                granted={accessibilityPermissionGranted}
                onRequest={testAccessibilityPermission}
                buttonText="测试/打开"
              />
            </div>
          </div>

          <div className="settings-card settings-card-primary">
            <div className="settings-section-title">
              <h2>AI 配置</h2>
              <p>配置用于转录后文本优化的 OpenAI 兼容接口。</p>
            </div>

            <div className="settings-switch-row">
              <div>
                <strong>启用 AI 文本优化</strong>
                <span>转录完成后自动润色中文表达</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.enable_ai_optimization}
                onClick={() => handleInputChange("enable_ai_optimization", !settings.enable_ai_optimization)}
                className={`modern-switch ${settings.enable_ai_optimization ? "modern-switch-on" : ""}`}
              >
                <span />
              </button>
            </div>

            <Field label="API Key" hint="用于 AI 文本优化功能的 API 密钥">
              <div className="settings-secret-field">
                <input
                  type={showApiKey ? "text" : "password"}
                  value={settings.ai_api_key}
                  onChange={(event) => handleInputChange("ai_api_key", event.target.value)}
                  placeholder="请输入您的 AI API Key"
                />
                <button type="button" onClick={() => setShowApiKey((value) => !value)}>
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>

            <Field label="API Base URL" hint="支持 OpenAI 兼容 API">
              <input
                type="url"
                value={settings.ai_base_url}
                onChange={(event) => handleInputChange("ai_base_url", event.target.value)}
                placeholder="https://api.openai.com/v1"
              />
            </Field>

            <div className="settings-model-toolbar">
              <span>AI 模型</span>
              <div>
                <button type="button" onClick={applyRecommendedConfig}>阿里云推荐</button>
                <button type="button" onClick={resetToOpenAI}>OpenAI</button>
              </div>
            </div>

            <div className="settings-radio-stack">
              <label>
                <input type="radio" name="model-type" checked={!customModel} onChange={() => setCustomModel(false)} />
                <span>预定义模型</span>
              </label>
              {!customModel && (
                <select value={settings.ai_model} onChange={(event) => handleInputChange("ai_model", event.target.value)}>
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  <option value="gpt-4">GPT-4</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                  <option value="gpt-4o">GPT-4o</option>
                  <option value="gpt-4o-mini">GPT-4o Mini</option>
                  <option value="qwen3-30b-a3b-instruct-2507">Qwen3-30B (推荐)</option>
                </select>
              )}

              <label>
                <input type="radio" name="model-type" checked={customModel} onChange={() => setCustomModel(true)} />
                <span>自定义模型</span>
              </label>
              {customModel && (
                <input
                  type="text"
                  value={settings.ai_model}
                  onChange={(event) => handleInputChange("ai_model", event.target.value)}
                  placeholder="输入自定义模型名称"
                />
              )}
            </div>

            {testResult && (
              <div className={`settings-test-result ${testResult.available ? "settings-test-success" : "settings-test-error"}`}>
                {testResult.available ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                <div>
                  <strong>{testResult.available ? "AI 配置测试成功" : "AI 配置测试失败"}</strong>
                  <span>{testResult.available ? testResult.model || testResult.details || "连接正常" : testResult.error || testResult.details || "未知错误"}</span>
                </div>
              </div>
            )}

            <div className="settings-actions">
              <button type="button" className="secondary-command" onClick={testAIConfiguration} disabled={testing}>
                {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube className="h-4 w-4" />}
                <span>{testing ? "测试中..." : "测试配置"}</span>
              </button>
              <button type="button" className="primary-command" onClick={saveSettings} disabled={saving || !settings.ai_api_key}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                <span>{saving ? "保存中..." : "保存设置"}</span>
              </button>
            </div>
          </div>

          <div className="settings-card">
            <div className="settings-section-title">
              <h2>关于蝴蝶 Speech</h2>
              <p>基于 FunASR 与 AI 优化的中文语音转文字桌面工具。</p>
            </div>
          </div>
        </section>
      </main>
      <Toaster />
    </PageShell>
  );
};

export { SettingsPage };

if (document.getElementById("settings-root")) {
  const root = ReactDOM.createRoot(document.getElementById("settings-root"));
  root.render(<SettingsPage />);
}
