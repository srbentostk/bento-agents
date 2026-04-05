import { type ChildProcess, exec, spawn } from 'child_process';
import * as os from 'os';
import * as vscode from 'vscode';

export interface ManagedServer {
  id: string;
  name: string;
  command: string;
  cwd: string;
  color: string;
  status: 'running' | 'stopped' | 'error';
  exitCode: number | null;
  pid: number | undefined;
  /** Listening port detected for this server */
  port?: number;
  /** Local address the server is bound to */
  localAddr?: string;
  /** True if this server was auto-detected (not started by the user) */
  isDetected?: boolean;
}

const SERVER_COLORS = [
  '#e74c3c', // vermelho
  '#3498db', // azul
  '#2ecc71', // verde
  '#f39c12', // laranja
  '#9b59b6', // roxo
  '#1abc9c', // teal
  '#e67e22', // âmbar
  '#00bcd4', // ciano
];

const MAX_LOG_LINES = 500;

export class ServerManager {
  private servers = new Map<string, { meta: ManagedServer; process: ChildProcess | null }>();
  private logs = new Map<string, string[]>();
  private nextColorIndex = 0;
  private webview: vscode.Webview | undefined;

  setWebview(webview: vscode.Webview | undefined): void {
    this.webview = webview;
  }

  getAll(): ManagedServer[] {
    return [...this.servers.values()].map((s) => s.meta);
  }

  getLogs(id: string): string[] {
    return this.logs.get(id) ?? [];
  }

  start(
    id: string,
    name: string,
    command: string,
    cwd?: string,
    colorOverride?: string,
  ): ManagedServer {
    // Se já existe um processo rodando com esse id, para primeiro
    const existing = this.servers.get(id);
    if (existing?.process && existing.meta.status === 'running') {
      this._killProcess(existing.process, existing.meta.pid);
    }

    const color = colorOverride ?? SERVER_COLORS[this.nextColorIndex % SERVER_COLORS.length];
    if (!colorOverride) this.nextColorIndex++;

    const workdir =
      cwd || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || os.homedir();

    const meta: ManagedServer = {
      id,
      name,
      command,
      cwd: workdir,
      color,
      status: 'running',
      exitCode: null,
      pid: undefined,
    };

    this.logs.set(id, []);

    let proc: ChildProcess;
    try {
      proc = spawn(command, [], {
        cwd: workdir,
        shell: true,
        env: { ...process.env },
      });
    } catch (err) {
      meta.status = 'error';
      this.servers.set(id, { meta, process: null });
      this.webview?.postMessage({ type: 'serverStarted', server: { ...meta } });
      return meta;
    }

    meta.pid = proc.pid;
    this.servers.set(id, { meta, process: proc });
    this.webview?.postMessage({ type: 'serverStarted', server: { ...meta } });

    const appendLog = (text: string, stream: 'stdout' | 'stderr') => {
      const lines = this.logs.get(id) ?? [];
      const newLines = text
        .split('\n')
        .map((l) => l.trimEnd())
        .filter((l) => l.length > 0);
      const updated = [...lines, ...newLines].slice(-MAX_LOG_LINES);
      this.logs.set(id, updated);
      this.webview?.postMessage({ type: 'serverLog', id, text, stream });
    };

    proc.stdout?.on('data', (data: Buffer) => appendLog(String(data), 'stdout'));
    proc.stderr?.on('data', (data: Buffer) => appendLog(String(data), 'stderr'));

    proc.on('close', (code) => {
      const entry = this.servers.get(id);
      if (!entry) return;
      entry.meta.status = code === 0 ? 'stopped' : 'error';
      entry.meta.exitCode = code;
      entry.process = null;
      this.webview?.postMessage({ type: 'serverStopped', id, exitCode: code });
    });

    proc.on('error', (err) => {
      appendLog(`[processo] ${err.message}`, 'stderr');
      const entry = this.servers.get(id);
      if (entry) {
        entry.meta.status = 'error';
        entry.process = null;
        this.webview?.postMessage({ type: 'serverStopped', id, exitCode: -1 });
      }
    });

    return meta;
  }

  stop(id: string): void {
    const entry = this.servers.get(id);
    if (!entry) return;
    const { process: proc, meta } = entry;
    if (proc && meta.status === 'running') {
      this._killProcess(proc, meta.pid);
    }
  }

  remove(id: string): void {
    this.stop(id);
    this.servers.delete(id);
    this.logs.delete(id);
    this.webview?.postMessage({ type: 'serverRemoved', id });
  }

  sendLogsSnapshot(id: string): void {
    const lines = this.logs.get(id);
    if (!lines) return;
    this.webview?.postMessage({ type: 'serverLogsSnapshot', id, lines });
  }

  dispose(): void {
    for (const [, entry] of this.servers) {
      if (entry.process && entry.meta.status === 'running') {
        this._killProcess(entry.process, entry.meta.pid);
      }
    }
    this.servers.clear();
    this.logs.clear();
  }

  /**
   * Scan for running Node.js processes that are listening on ports.
   * Adds newly detected servers and removes stale ones.
   */
  async discoverRunningServers(): Promise<void> {
    try {
      const detected = await this._detectNodePorts();
      // Add newly found servers
      for (const info of detected) {
        const id = `detected:${info.pid}:${info.port}`;
        if (this.servers.has(id)) continue;
        const color = SERVER_COLORS[this.nextColorIndex % SERVER_COLORS.length];
        this.nextColorIndex++;
        const meta: ManagedServer = {
          id,
          name: `node :${info.port}`,
          command: `pid ${info.pid}`,
          cwd: '',
          color,
          status: 'running',
          exitCode: null,
          pid: info.pid,
          port: info.port,
          localAddr: info.localAddr,
          isDetected: true,
        };
        this.servers.set(id, { meta, process: null });
        this.webview?.postMessage({ type: 'serverStarted', server: { ...meta } });
      }
      // Mark stale detected servers as stopped
      const livePids = new Set(detected.map((d) => d.pid));
      for (const [id, entry] of this.servers) {
        if (!id.startsWith('detected:')) continue;
        if (entry.meta.pid !== undefined && !livePids.has(entry.meta.pid) && entry.meta.status === 'running') {
          entry.meta.status = 'stopped';
          this.webview?.postMessage({ type: 'serverStopped', id, exitCode: null });
        }
      }
    } catch {
      // Silently ignore discovery errors
    }
  }

  private _detectNodePorts(): Promise<Array<{ pid: number; port: number; localAddr: string }>> {
    return new Promise((resolve) => {
      if (process.platform === 'win32') {
        exec('netstat -ano -p TCP', (err, netstatOut) => {
          if (err || !netstatOut) {
            resolve([]);
            return;
          }
          exec('tasklist /FI "IMAGENAME eq node.exe" /FO CSV /NH', (_err2, taskOut) => {
            const nodePids = new Set<number>();
            for (const line of (taskOut ?? '').split('\n')) {
              const m = line.match(/"node\.exe","(\d+)"/i);
              if (m) nodePids.add(parseInt(m[1], 10));
            }
            const results: Array<{ pid: number; port: number; localAddr: string }> = [];
            for (const line of netstatOut.split('\n')) {
              const m = line.match(/TCP\s+([\d.]+):(\d+)\s+[\d.]+:\d+\s+LISTENING\s+(\d+)/i);
              if (!m) continue;
              const pid = parseInt(m[3], 10);
              if (!nodePids.has(pid)) continue;
              const port = parseInt(m[2], 10);
              if (port < 1024) continue;
              results.push({ pid, port, localAddr: m[1] });
            }
            resolve(results);
          });
        });
      } else {
        exec(
          "lsof -i TCP -s TCP:LISTEN -P -n 2>/dev/null | grep -E '^node '",
          (_err, stdout) => {
            const results: Array<{ pid: number; port: number; localAddr: string }> = [];
            for (const line of (stdout ?? '').split('\n')) {
              // node   1234  user  12u  IPv4  ...  TCP *:3000 (LISTEN)
              const m = line.match(/^node\s+(\d+)\s+\S+\s+\S+\s+\S+\s+\S+\s+\S+\s+TCP\s+([\d.*]+):(\d+)/i);
              if (!m) continue;
              const pid = parseInt(m[1], 10);
              const port = parseInt(m[3], 10);
              if (port < 1024) continue;
              results.push({ pid, port, localAddr: m[2] === '*' ? '0.0.0.0' : m[2] });
            }
            resolve(results);
          },
        );
      }
    });
  }

  private _killProcess(proc: ChildProcess, pid: number | undefined): void {
    try {
      if (process.platform === 'win32' && pid !== undefined) {
        spawn('taskkill', ['/pid', String(pid), '/f', '/t'], { shell: false });
      } else {
        proc.kill('SIGTERM');
      }
    } catch {
      // ignora erros ao matar processo
    }
  }
}
