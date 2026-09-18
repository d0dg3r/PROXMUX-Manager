import {
    attachFloatingWindowLifecycle,
    openClassicPopupPageAsTab,
    openOrFocusFloatingWindow,
    resolveToolbarClickAction
} from './lib/window-launcher.js';

const DEFAULT_CLICK_MODE_KEY = 'defaultActionClickMode';
const DEFAULT_CLICK_MODE = 'sidepanel';
let cachedClickMode = DEFAULT_CLICK_MODE;

async function getDefaultClickMode() {
    const result = await chrome.storage.local.get([DEFAULT_CLICK_MODE_KEY]);
    const value = result[DEFAULT_CLICK_MODE_KEY];
    if (value === 'floating' || value === 'sidepanel') {
        return value;
    }
    return DEFAULT_CLICK_MODE;
}

async function refreshCachedClickMode() {
    cachedClickMode = await getDefaultClickMode();
}

async function openManagerFallback(windowId = null) {
    try {
        await openOrFocusFloatingWindow();
    } catch (_error) {
        await openClassicPopupPageAsTab(windowId);
    }
}

async function handleToolbarClick(tab) {
    const action = resolveToolbarClickAction({
        clickMode: cachedClickMode,
        canOpenSidePanel: Boolean(chrome.sidePanel?.open),
        windowId: tab?.windowId
    });

    if (action.kind === 'sidepanel') {
        try {
            await chrome.sidePanel.open({ windowId: action.windowId });
            return;
        } catch (_error) {
            await openManagerFallback(action.windowId);
            return;
        }
    }

    await openManagerFallback(Number.isInteger(tab?.windowId) ? tab.windowId : null);
}

refreshCachedClickMode().catch(() => {});
attachFloatingWindowLifecycle();

chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local' || !changes[DEFAULT_CLICK_MODE_KEY]) return;
    const nextValue = changes[DEFAULT_CLICK_MODE_KEY].newValue;
    cachedClickMode = nextValue === 'floating' ? 'floating' : DEFAULT_CLICK_MODE;
});

chrome.action.onClicked.addListener((tab) => {
    handleToolbarClick(tab).catch(() => {});
});
