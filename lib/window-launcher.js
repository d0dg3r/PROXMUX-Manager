const FLOATING_WINDOW_ID_KEY = 'floatingWindowId';
const FLOATING_VIEW = 'floating';
const POPUP_VIEW = 'popup';

function getPopupViewUrl(view) {
    return chrome.runtime.getURL(`popup/popup.html?view=${encodeURIComponent(view)}`);
}

function isFloatingViewUrl(url) {
    return typeof url === 'string' && url.startsWith(getPopupViewUrl(FLOATING_VIEW));
}

function isValidFloatingWindow(windowInfo) {
    if (!windowInfo || !Array.isArray(windowInfo.tabs)) return false;
    return windowInfo.tabs.some(tab => isFloatingViewUrl(tab.url));
}

async function getStoredFloatingWindowId() {
    const result = await chrome.storage.local.get([FLOATING_WINDOW_ID_KEY]);
    return Number.isInteger(result[FLOATING_WINDOW_ID_KEY]) ? result[FLOATING_WINDOW_ID_KEY] : null;
}

async function setStoredFloatingWindowId(windowId) {
    await chrome.storage.local.set({ [FLOATING_WINDOW_ID_KEY]: windowId });
}

async function clearStoredFloatingWindowId() {
    await chrome.storage.local.remove(FLOATING_WINDOW_ID_KEY);
}

async function getWindowById(windowId) {
    try {
        return await chrome.windows.get(windowId, { populate: true });
    } catch (_error) {
        return null;
    }
}

async function findFloatingWindowFromTabs() {
    const floatingTabs = await chrome.tabs.query({ url: `${getPopupViewUrl(FLOATING_VIEW)}*` });
    if (!floatingTabs.length) return null;
    const tab = floatingTabs[0];
    if (!Number.isInteger(tab.windowId)) return null;
    const windowInfo = await getWindowById(tab.windowId);
    if (!isValidFloatingWindow(windowInfo)) return null;
    return windowInfo;
}

export async function openOrFocusFloatingWindow(options = {}) {
    const storedWindowId = await getStoredFloatingWindowId();
    if (storedWindowId !== null) {
        const storedWindow = await getWindowById(storedWindowId);
        if (isValidFloatingWindow(storedWindow)) {
            await chrome.windows.update(storedWindowId, { focused: true });
            return { reused: true, windowId: storedWindowId };
        }
        await clearStoredFloatingWindowId();
    }

    const discoveredWindow = await findFloatingWindowFromTabs();
    if (discoveredWindow) {
        await setStoredFloatingWindowId(discoveredWindow.id);
        await chrome.windows.update(discoveredWindow.id, { focused: true });
        return { reused: true, windowId: discoveredWindow.id };
    }

    const createdWindow = await chrome.windows.create({
        url: getPopupViewUrl(FLOATING_VIEW),
        type: 'popup',
        focused: true,
        width: options.width || 1200,
        height: options.height || 860
    });
    if (Number.isInteger(createdWindow?.id)) {
        await setStoredFloatingWindowId(createdWindow.id);
    }

    return { reused: false, windowId: createdWindow?.id ?? null };
}

export async function openClassicPopupPageAsTab(windowId = null) {
    const createOptions = {
        url: getPopupViewUrl(POPUP_VIEW),
        active: true
    };
    if (Number.isInteger(windowId)) {
        createOptions.windowId = windowId;
    }

    const tab = await chrome.tabs.create(createOptions);
    return tab;
}
