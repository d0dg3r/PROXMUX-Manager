import { openOrFocusFloatingWindow } from './lib/window-launcher.js';

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
    const mode = await getDefaultClickMode();
    cachedClickMode = mode;
}

refreshCachedClickMode().catch(() => {});

chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local' || !changes[DEFAULT_CLICK_MODE_KEY]) return;
    const nextValue = changes[DEFAULT_CLICK_MODE_KEY].newValue;
    cachedClickMode = nextValue === 'floating' ? 'floating' : DEFAULT_CLICK_MODE;
});

chrome.action.onClicked.addListener((tab) => {
    const clickMode = cachedClickMode;

    if (clickMode === 'floating') {
        openOrFocusFloatingWindow().catch(() => {});
        return;
    }

    if (chrome.sidePanel?.open && Number.isInteger(tab?.windowId)) {
        chrome.sidePanel.open({ windowId: tab.windowId })
            .catch(() => {});
        return;
    }
});
