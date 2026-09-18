export function formatGuestOsType(osType) {
    const value = String(osType || '').trim().toLowerCase();
    if (!value) return null;

    const map = {
        l26: 'Linux 2.6+'
    };

    return map[value] || osType;
}

/**
 * Categorize a connection error message into a small set of stable kinds so the
 * UI can show a tailored hint (e.g. self-signed certificate vs network).
 */
export function categorizeConnectionError(error) {
    const message = (error && error.message) ? String(error.message) : String(error || '');
    const lower = message.toLowerCase();

    if (!message) return 'unknown';
    if (lower.includes('permission denied')) return 'permission';
    if (lower.includes('https url')) return 'https-only';
    if (lower.includes('401') || lower.includes('403') || lower.includes('auth error')) return 'auth';
    if (lower.includes('timeout')) return 'timeout';
    if (
        lower.includes('self-signed') ||
        lower.includes('selfsigned') ||
        lower.includes('err_cert') ||
        lower.includes('certificate')
    ) {
        return 'selfsigned';
    }
    if (lower.includes('ssl') || lower.includes('tls')) {
        return 'tls';
    }
    if (
        lower.includes('failed to fetch') ||
        lower.includes('networkerror') ||
        lower.includes('network request')
    ) {
        return 'network';
    }
    return 'unknown';
}

const IPV4_RE = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;

export function isPlausibleFailoverHostname(hostname, primaryHostname = '') {
    const host = String(hostname || '').trim().toLowerCase();
    if (!host) return false;
    if (IPV4_RE.test(host)) return true;
    if (host.includes('.')) return true;
    const primary = String(primaryHostname || '').trim().toLowerCase();
    return Boolean(primary) && host === primary;
}

export function deriveFailoverHostname(nodeName, primaryHostname = '') {
    const node = String(nodeName || '').trim();
    if (!node) return null;
    if (isPlausibleFailoverHostname(node, primaryHostname)) return node;
    const primary = String(primaryHostname || '').trim();
    const dotIndex = primary.indexOf('.');
    if (dotIndex > 0) {
        const derived = `${node}${primary.slice(dotIndex)}`;
        if (isPlausibleFailoverHostname(derived, primary)) return derived;
    }
    return null;
}

export function buildFailoverUrlList(primaryUrl, resources) {
    try {
        const nodes = (Array.isArray(resources) ? resources : []).filter((res) => res && res.type === 'node');
        if (nodes.length <= 1) return null;
        const urlObj = new URL(primaryUrl);
        const port = urlObj.port;
        const protocol = urlObj.protocol;
        const primaryHost = urlObj.hostname;
        const failoverUrls = nodes
            .map((node) => deriveFailoverHostname(node.node, primaryHost))
            .filter(Boolean)
            .map((host) => (port ? `${protocol}//${host}:${port}` : `${protocol}//${host}`).replace(/\/$/, ''));
        if (!failoverUrls.length) return null;
        const primary = String(primaryUrl || '').replace(/\/$/, '');
        return [...new Set([primary, ...failoverUrls])];
    } catch (_error) {
        return null;
    }
}

export class ProxmoxAPI {
    constructor(baseUrl, apiToken, failoverUrls = []) {
        this.baseUrl = baseUrl.replace(/\/$/, '');
        this.apiToken = apiToken;
        this.failoverUrls = failoverUrls.map(u => u.replace(/\/$/, ''));
        this.currentUrl = this.baseUrl;
    }

    async fetch(endpoint, options = {}) {
        // Prepare list of URLs to try: primary first, then others
        const urlsToTry = [this.currentUrl, ...this.failoverUrls.filter(u => u !== this.currentUrl)];
        let lastError = null;
        const attemptedUrls = [];

        for (const baseUrl of urlsToTry) {
            const url = `${baseUrl}/api2/json${endpoint}`;
            attemptedUrls.push(url);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

            const headers = {
                'Authorization': `PVEAPIToken=${this.apiToken}`,
                'Accept': 'application/json',
                ...options.headers
            };

            // Cache-busting for GET requests using headers instead of query params
            // Proxmox API is strict about unknown query parameters (400 error)
            if (!options.method || options.method === 'GET') {
                headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
                headers['Pragma'] = 'no-cache';
                headers['Expires'] = '0';
            }

            const fetchOptions = { 
                ...options, 
                headers,
                signal: controller.signal,
                credentials: 'omit',
                cache: 'no-store'
            };

            /* 
            if (options.method === 'POST') {
                console.log(`POST Request to ${endpoint} via ${baseUrl}`);
            }
            */

            try {
                const response = await fetch(url, fetchOptions);
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    const text = await response.text();
                    // If it's a 401/403, failover won't help, so throw immediately
                    if (response.status === 401 || response.status === 403) {
                        throw new Error(`API Auth Error: ${response.status} ${response.statusText} - ${text}`);
                    }
                    throw new Error(`API Error: ${response.status} ${response.statusText} - ${text}`);
                }
                const data = await response.json();
                // If we succeeded on a failover URL, update currentUrl for future requests
                if (baseUrl !== this.currentUrl) {
                    // console.log(`Failover success! Switched to ${baseUrl}`);
                    this.currentUrl = baseUrl;
                }

                return data.data;
            } catch (e) {
                clearTimeout(timeoutId);
                const context = `Request failed for ${url}`;
                
                const isConnectionError = e.name === 'AbortError' || 
                                        e.message.includes('Failed to fetch') || 
                                        e.message.includes('NetworkError');

                if (isConnectionError) {
                    if (e.name === 'AbortError') {
                        lastError = new Error(`${context}: timeout after 10s`);
                    } else {
                        lastError = new Error(
                            `${context}: network request could not be completed (check host permission, connectivity, and TLS/certificate trust)`
                        );
                    }
                    // console.warn(`Connection to ${baseUrl} failed, trying next node...`, e.message);
                    continue; // Try next URL
                }
                lastError = new Error(`${context}: ${e.message}`);
                throw lastError; // Terminate for logic/auth errors
            }
        }
        if (lastError && attemptedUrls.length > 1) {
            lastError.message += ` | attempted ${attemptedUrls.length} endpoints`;
        }
        throw lastError;
    }

    async getResources() {
        return this.fetch('/cluster/resources');
    }

    async getNodeStatus(node) {
        return this.fetch(`/nodes/${node}/status`);
    }

    async getNodeRRD(node, timeframe = 'hour') {
        return this.fetch(`/nodes/${node}/rrddata?timeframe=${timeframe}&cf=AVERAGE`);
    }

    async getVMConfig(node, type, vmid) {
        // type is 'qemu' or 'lxc'
        const endpoint = `/nodes/${node}/${type}/${vmid}/config`;
        return this.fetch(endpoint);
    }

    async getSpiceProxy(node, type, vmid) {
        const endpoint = `/nodes/${node}/${type}/${vmid}/spiceproxy`;
        return this.fetch(endpoint, { method: 'POST' });
    }

    getEffectiveBaseUrl() {
        return (this.currentUrl || this.baseUrl || '').replace(/\/$/, '');
    }

    getConsoleUrl(node, type, vmid, name) {
        const origin = this.getEffectiveBaseUrl();
        if (type === 'qemu') {
            return `${origin}/?console=kvm&novnc=1&vmid=${vmid}&node=${node}`;
        } else if (type === 'lxc') {
            return `${origin}/?console=lxc&xtermjs=1&vmid=${vmid}&node=${node}`;
        } else if (type === 'node') {
            return `${origin}/?console=shell&xtermjs=1&node=${node}`;
        }
        return null;
    }

    async getLxcInterfaces(node, vmid) {
        return this.fetch(`/nodes/${node}/lxc/${vmid}/interfaces`);
    }

    async getVmAgentNetwork(node, vmid) {
        return this.fetch(`/nodes/${node}/qemu/${vmid}/agent/network-get-interfaces`);
    }

    async getNodeNetwork(node) {
        return this.fetch(`/nodes/${node}/network`);
    }

    async isSpiceEnabled(node, type, vmid) {
        if (type !== 'qemu') return false;
        try {
            const config = await this.getVMConfig(node, type, vmid);
            // Proxmox config for SPICE often looks like "vga: qxl" or "vga: type=qxl,..."
            // or "vga: virtio-vga" (which supports spice).
            // Usually, if 'vga' is set to 'qxl' or mentions 'spice' or 'qxl', SPICE is active.
            const vga = config.vga || '';
            return vga.includes('qxl') || vga.includes('spice') || vga.includes('virtio');
        } catch (e) {
            return false;
        }
    }

    async getResourceStatus(node, type, vmid) {
        // type: qemu, lxc
        return this.fetch(`/nodes/${node}/${type}/${vmid}/status/current`);
    }

    async vmAction(node, type, vmid, action) {
        // action: start, stop, shutdown, reboot, pause, resume, suspend
        return this.fetch(`/nodes/${node}/${type}/${vmid}/status/${action}`, { method: 'POST' });
    }

    async nodeAction(node, action) {
        // action: reboot, shutdown
        const params = new URLSearchParams();
        params.append('command', action);
        return this.fetch(`/nodes/${node}/status`, {
            method: 'POST',
            body: params,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
    }

    async getSnapshots(node, type, vmid) {
        return this.fetch(`/nodes/${node}/${type}/${vmid}/snapshot`);
    }

    async createSnapshot(node, type, vmid, snapname, description = '') {
        const params = new URLSearchParams();
        params.append('snapname', snapname);
        if (description) params.append('description', description);
        return this.fetch(`/nodes/${node}/${type}/${vmid}/snapshot`, {
            method: 'POST',
            body: params,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
    }

    async deleteSnapshot(node, type, vmid, snapname, force = false) {
        const suffix = force ? '?force=1' : '';
        return this.fetch(`/nodes/${node}/${type}/${vmid}/snapshot/${encodeURIComponent(snapname)}${suffix}`, {
            method: 'DELETE'
        });
    }

    async rollbackSnapshot(node, type, vmid, snapname) {
        return this.fetch(`/nodes/${node}/${type}/${vmid}/snapshot/${encodeURIComponent(snapname)}/rollback`, {
            method: 'POST'
        });
    }

    async getClusterTasks({ limit = 25, source = 'archive', errors = false } = {}) {
        const params = new URLSearchParams();
        if (limit) params.append('limit', String(limit));
        if (source) params.append('source', source);
        if (errors) params.append('errors', '1');
        const query = params.toString();
        return this.fetch(`/cluster/tasks${query ? `?${query}` : ''}`);
    }

    async getResourceDetails(res) {
        const details = { ip: null, os: null, disks: [] };
        try {
            if (res.type === 'node') {
                const status = await this.getNodeStatus(res.node);
                const fullVersion = status.pveversion || '';
                const match = fullVersion.match(/pve-manager\/([0-9.]+)/);
                details.os = match ? `PVE ${match[1]}` : 'PVE';
                
                // Map node metrics
                if (status.loadavg) res.loadavg = status.loadavg;
                if (status.cpu) res.cpu = status.cpu;
                if (status.memory) {
                    res.mem = status.memory.used;
                    res.maxmem = status.memory.total;
                }
                
                // Advanced node metrics
                if (status.netin !== undefined) res.netin = status.netin;
                if (status.netout !== undefined) res.netout = status.netout;
                if (status.diskread !== undefined) res.diskread = status.diskread;
                if (status.diskwrite !== undefined) res.diskwrite = status.diskwrite;

                // If node status IO is 0 or missing, try RRD for rates
                if (!res.netin && !res.netout) {
                    try {
                        const rrd = await this.getNodeRRD(res.node);
                        if (rrd && rrd.length > 0) {
                            // Walk newest-first without mutating the API response array.
                            const lastData = [...rrd].reverse().find(d => d.netin !== null);
                            if (lastData) {
                                res.netin = lastData.netin;
                                res.netout = lastData.netout;
                                res.diskread = lastData.diskread;
                                res.diskwrite = lastData.diskwrite;
                            }
                        }
                    } catch (e) { console.error('RRD fetch failed', e); }
                }
                
                // 1. Try name if it's an IP
                if (/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(res.node)) {
                    details.ip = res.node;
                } 
                
                // 2. Try network interfaces if IP still missing
                if (!details.ip) {
                    try {
                        const network = await this.getNodeNetwork(res.node);
                        // Prioritize bridge interfaces with an address (common for PVE management)
                        const bridge = network.find(i => i.type === 'bridge' && i.address);
                        if (bridge) {
                            details.ip = bridge.address;
                        } else {
                            // Fallback to physical interfaces
                            const eth = network.find(i => 
                                (i.type === 'eth' || i.iface.startsWith('eno') || i.iface.startsWith('eth') || i.iface.startsWith('enp')) && 
                                i.address && i.active
                            );
                            if (eth) details.ip = eth.address;
                        }
                    } catch (netErr) {}
                }
            } else {
                const [config, status] = await Promise.all([
                    this.getVMConfig(res.node, res.type, res.vmid),
                    this.getResourceStatus(res.node, res.type, res.vmid)
                ]);

                details.os = formatGuestOsType(config.ostype || config.os || null);
                
                // Real-time usage often better in status/current
                if (status.uptime) res.uptime = status.uptime;
                if (status.cpu) res.cpu = status.cpu;
                if (status.mem) res.mem = status.mem;
                if (status.maxmem) res.maxmem = status.maxmem;
                
                // Advanced metrics
                if (status.netin !== undefined) res.netin = status.netin;
                if (status.netout !== undefined) res.netout = status.netout;
                if (status.diskread !== undefined) res.diskread = status.diskread;
                if (status.diskwrite !== undefined) res.diskwrite = status.diskwrite;
                if (status.loadavg !== undefined) res.loadavg = status.loadavg;
                if (status.hastatus !== undefined) res.hastatus = status.hastatus;

                // Multi-disk detection from config
                const diskKeys = Object.keys(config).filter(key => 
                    /^(ide|sata|scsi|virtio|rootfs|unused)\d+$/.test(key)
                );

                diskKeys.forEach(key => {
                    const value = config[key];
                    // Example: "local-lvm:vm-101-disk-0,size=32G" or "volume=...,size=..."
                    const sizeMatch = value.match(/size=([\d.KMGT]+)/);
                    if (sizeMatch) {
                        const rawSize = sizeMatch[1];
                        // Convert to bytes
                        let sizeBytes = parseFloat(rawSize);
                        if (rawSize.endsWith('G')) sizeBytes *= 1024 * 1024 * 1024;
                        else if (rawSize.endsWith('M')) sizeBytes *= 1024 * 1024;
                        else if (rawSize.endsWith('K')) sizeBytes *= 1024;
                        else if (rawSize.endsWith('T')) sizeBytes *= 1024 * 1024 * 1024 * 1024;

                        details.disks.push({
                            name: key.toUpperCase(),
                            max: sizeBytes,
                            used: null // Note: usage inside VM is hard without agent
                        });
                    }
                });

                // If only one disk and it matches cluster resource disk, sync usage
                if (details.disks.length === 1 && res.maxdisk && Math.abs(details.disks[0].max - res.maxdisk) < 1024*1024) {
                    details.disks[0].used = res.disk;
                } else if (res.type === 'lxc' && details.disks.length > 0) {
                    // LXC usually has usage in status
                    details.disks[0].used = status.disk || res.disk;
                }

                if (res.type === 'lxc') {
                    const interfaces = await this.getLxcInterfaces(res.node, res.vmid);
                    if (Array.isArray(interfaces)) {
                        const eth0 = interfaces.find(i => i.name === 'eth0');
                        if (eth0 && eth0.inet) details.ip = eth0.inet.split('/')[0];
                    }
                } else if (res.type === 'qemu' && res.status === 'running') {
                    try {
                        const agentNet = await this.getVmAgentNetwork(res.node, res.vmid);
                        if (agentNet && Array.isArray(agentNet.result)) {
                            for (const iface of agentNet.result) {
                                if (iface.name !== 'lo') {
                                    const addr = iface['ip-addresses']?.find(a => a['ip-address-type'] === 'ipv4');
                                    if (addr) {
                                        details.ip = addr['ip-address'];
                                        break;
                                    }
                                }
                            }
                        }
                    } catch (e) {}
                }
            }
        } catch (e) {
            console.error(`Failed to get details for ${res.type} ${res.vmid || res.node}`, e);
        }
        return details;
    }

    /**
     * Checks if the browser has a valid session cookie for Proxmox.
     * Uses chrome.cookies.get if available, otherwise falls back to a fetch test.
     */
    async checkSession() {
        const origins = [...new Set([this.currentUrl, this.baseUrl].filter(Boolean).map((value) => value.replace(/\/$/, '')))];

        if (typeof chrome !== 'undefined' && chrome.cookies) {
            for (const origin of origins) {
                try {
                    const cookie = await chrome.cookies.get({
                        url: origin,
                        name: 'PVEAuthCookie'
                    });
                    if (cookie) return true;

                    const domain = new URL(origin).hostname;
                    const cookies = await chrome.cookies.getAll({ domain });
                    if (cookies.some((entry) => entry.name === 'PVEAuthCookie')) {
                        return true;
                    }
                } catch (_error) {
                    // Cookie lookup can fail for ungranted hosts; try the next origin.
                }
            }
        }

        for (const origin of origins) {
            try {
                const response = await fetch(`${origin}/api2/json/access/ticket`, {
                    method: 'GET',
                    credentials: 'include',
                    redirect: 'error'
                });
                if (response.status === 200) {
                    const data = await response.json();
                    if (data?.data?.username) return true;
                }
            } catch (_error) {
                // Missing session or CORS is treated as "not signed in".
            }
        }
        return false;
    }
}
