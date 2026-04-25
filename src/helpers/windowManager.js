const { BrowserWindow } = require("electron");
const path = require("path");

class WindowManager {
  constructor() {
    this.mainWindow = null;
    this.controlPanelWindow = null;
    this.historyWindow = null;
    this.settingsWindow = null;
    this.mainWindowNormalBounds = null;
    this.alwaysOnTop = false;
  }

  async createMainWindow() {
    if (this.mainWindow) {
      this.mainWindow.focus();
      return this.mainWindow;
    }

    this.mainWindow = new BrowserWindow({
      width: 960,
      height: 720,
      minWidth: 760,
      minHeight: 620,
      frame: false,
      transparent: true,
      alwaysOnTop: this.alwaysOnTop,
      resizable: true,
      skipTaskbar: true,
      movable: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, "..", "..", "preload.js"),
      },
    });

    const isDev = process.env.NODE_ENV === "development";

    if (isDev) {
      await this.mainWindow.loadURL("http://localhost:5173");
    } else {
      await this.mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
    }

    this.mainWindow.on("closed", () => {
      this.mainWindow = null;
    });

    return this.mainWindow;
  }

  async createControlPanelWindow() {
    if (this.controlPanelWindow) {
      this.controlPanelWindow.focus();
      return this.controlPanelWindow;
    }

    this.controlPanelWindow = new BrowserWindow({
      width: 800,
      height: 600,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, "..", "..", "preload.js"),
      },
    });

    const isDev = process.env.NODE_ENV === "development";

    if (isDev) {
      await this.controlPanelWindow.loadURL("http://localhost:5173?panel=control");
    } else {
      await this.controlPanelWindow.loadFile(
        path.join(__dirname, "..", "dist", "index.html"),
        { query: { panel: "control" } }
      );
    }

    this.controlPanelWindow.on("closed", () => {
      this.controlPanelWindow = null;
    });

    return this.controlPanelWindow;
  }

  async createHistoryWindow() {
    if (this.historyWindow) {
      this.historyWindow.focus();
      return this.historyWindow;
    }

    this.historyWindow = new BrowserWindow({
      width: 1000,
      height: 700,
      minWidth: 820,
      minHeight: 560,
      show: false,
      title: "转录历史 - 蛐蛐",
      frame: false,
      transparent: true,
      alwaysOnTop: this.alwaysOnTop,
      resizable: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, "..", "..", "preload.js"),
      },
    });

    const isDev = process.env.NODE_ENV === "development";

    if (isDev) {
      await this.historyWindow.loadURL("http://localhost:5173/history.html");
    } else {
      await this.historyWindow.loadFile(
        path.join(__dirname, "..", "dist", "history.html")
      );
    }

    this.historyWindow.on("closed", () => {
      this.historyWindow = null;
    });

    return this.historyWindow;
  }

  async createSettingsWindow() {
    if (this.settingsWindow) {
      this.settingsWindow.focus();
      return this.settingsWindow;
    }

    this.settingsWindow = new BrowserWindow({
      width: 860,
      height: 680,
      minWidth: 760,
      minHeight: 560,
      show: false,
      title: "设置 - 蛐蛐",
      frame: false,
      transparent: true,
      alwaysOnTop: this.alwaysOnTop,
      resizable: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, "..", "..", "preload.js"),
      },
    });

    const isDev = process.env.NODE_ENV === "development";

    if (isDev) {
      await this.settingsWindow.loadURL("http://localhost:5173?page=settings");
    } else {
      await this.settingsWindow.loadFile(
        path.join(__dirname, "..", "dist", "settings.html")
      );
    }

    this.settingsWindow.on("closed", () => {
      this.settingsWindow = null;
    });

    return this.settingsWindow;
  }

  showControlPanel() {
    if (this.controlPanelWindow) {
      this.controlPanelWindow.show();
      this.controlPanelWindow.focus();
    } else {
      this.createControlPanelWindow().then(() => {
        this.controlPanelWindow.show();
      });
    }
  }

  hideControlPanel() {
    if (this.controlPanelWindow) {
      this.controlPanelWindow.hide();
    }
  }

  showHistoryWindow() {
    if (this.historyWindow) {
      this.historyWindow.show();
      this.historyWindow.focus();
      this.historyWindow.setAlwaysOnTop(this.alwaysOnTop);
    } else {
      this.createHistoryWindow().then(() => {
        this.historyWindow.show();
        this.historyWindow.focus();
        this.historyWindow.setAlwaysOnTop(this.alwaysOnTop);
      });
    }
  }

  hideHistoryWindow() {
    if (this.historyWindow) {
      this.historyWindow.hide();
    }
  }

  closeHistoryWindow() {
    if (this.historyWindow) {
      this.historyWindow.close();
    }
  }

  showSettingsWindow() {
    if (this.settingsWindow) {
      this.settingsWindow.show();
      this.settingsWindow.focus();
      this.settingsWindow.setAlwaysOnTop(this.alwaysOnTop);
    } else {
      this.createSettingsWindow().then(() => {
        this.settingsWindow.show();
        this.settingsWindow.focus();
        this.settingsWindow.setAlwaysOnTop(this.alwaysOnTop);
      });
    }
  }

  hideSettingsWindow() {
    if (this.settingsWindow) {
      this.settingsWindow.hide();
    }
  }

  closeSettingsWindow() {
    if (this.settingsWindow) {
      this.settingsWindow.close();
    }
  }

  closeAllWindows() {
    if (this.mainWindow) {
      this.mainWindow.close();
    }
    if (this.controlPanelWindow) {
      this.controlPanelWindow.close();
    }
    if (this.historyWindow) {
      this.historyWindow.close();
    }
    if (this.settingsWindow) {
      this.settingsWindow.close();
    }
  }

  getMainWindowState() {
    if (!this.mainWindow) {
      return {
        isMaximized: false,
        isAlwaysOnTop: this.alwaysOnTop,
      };
    }

    return {
      isMaximized: this.mainWindow.isMaximized(),
      isAlwaysOnTop: this.alwaysOnTop,
    };
  }

  toggleMainWindowMaximize() {
    if (!this.mainWindow) {
      return this.getMainWindowState();
    }

    if (this.mainWindow.isMaximized()) {
      this.mainWindow.unmaximize();
    } else {
      this.mainWindow.maximize();
    }

    return this.getMainWindowState();
  }

  toggleMainWindowAlwaysOnTop() {
    if (!this.mainWindow) {
      return this.getMainWindowState();
    }

    const nextValue = !this.alwaysOnTop;
    this.alwaysOnTop = nextValue;

    if (this.mainWindow) {
      this.mainWindow.setAlwaysOnTop(nextValue);
    }
    if (this.historyWindow) {
      this.historyWindow.setAlwaysOnTop(nextValue);
    }
    if (this.settingsWindow) {
      this.settingsWindow.setAlwaysOnTop(nextValue);
    }
    if (this.controlPanelWindow) {
      this.controlPanelWindow.setAlwaysOnTop(nextValue);
    }

    return this.getMainWindowState();
  }

  setMainWindowCompactMode(enabled) {
    if (!this.mainWindow) {
      return this.getMainWindowState();
    }

    if (enabled) {
      if (!this.mainWindowNormalBounds) {
        this.mainWindowNormalBounds = this.mainWindow.getBounds();
      }
      this.mainWindow.setMinimumSize(250, 210);
      this.mainWindow.setSize(270, 230, true);
    } else {
      this.mainWindow.setMinimumSize(760, 620);
      if (this.mainWindowNormalBounds) {
        this.mainWindow.setBounds(this.mainWindowNormalBounds, true);
      } else {
        this.mainWindow.setSize(960, 720, true);
      }
      this.mainWindowNormalBounds = null;
    }

    return this.getMainWindowState();
  }
}

module.exports = WindowManager;
