let handling = 0;

importScripts("browser-polyfill.js");
browser.tabs.onActivated.addListener(handleEvent);
browser.tabs.onAttached.addListener(handleEvent);
browser.tabs.onMoved.addListener(handleEvent);
browser.tabs.onRemoved.addListener(handleEvent);
browser.tabs.onUpdated.addListener(handleEvent);

/**
 * Creates second tab.
 *
 * @param window - Window.
 */
async function createSecondTab(window) {
  await retry(async () => {
    if (trapInstalled(window) && window.tabs.length === 1)
      await browser.tabs.create({
        url: "chrome://newtab/",
        windowId: window.id
      });
  });
}

/**
 * Creates trap.
 *
 * @param window - Window.
 */
async function createTrap(window) {
  await retry(async () => {
    if (window.tabs.some(tab => tab.pinned)) {
      // Do not create trap if there are already pinned tabs
    } else
      await browser.tabs.create({
        active: false,
        index: 0,
        pinned: true,
        url: "about:blank",
        windowId: window.id
      });
  });
}

/**
 * Fades trap.
 *
 * @param window - Window.
 */
async function fadeTrap(window) {
  await retry(async () => {
    if (trapInstalled(window) && window.tabs.length >= 2) {
      const tab = window.tabs[0];

      if (tab.active) {
        const secondTab = window.tabs[1];

        await browser.tabs.update(secondTab.id, { active: true });
      }
    }
  });
}

/**
 * Handles Chrome event.
 */
async function handleEvent() {
  if (handling) return;

  handling++;

  try {
    const windows = await chrome.windows.getAll({
      populate: true,
      windowTypes: ["normal"]
    });

    await Promise.all(windows.map(handleWindow));
  } finally {
    handling--;
  }
}

/**
 * Handles Chrome event.
 *
 * @param window - Window.
 */
async function handleWindow(window) {
  await createTrap(window);
  await createSecondTab(window);
  await fadeTrap(window);
  await removeUnnecessaryNewTabs(window);
}

/**
 * Removes unnecessary new tabs.
 *
 * @param window - Window.
 */
async function removeUnnecessaryNewTabs(window) {
  await retry(async () => {
    if (trapInstalled(window)) {
      const tabs = window.tabs
        .slice(0, -1)
        .filter(
          tab => tab.url === "chrome://newtab/" && !tab.active && !tab.pinned
        );

      await Promise.all(tabs.map(tab => browser.tabs.remove(tab.id)));
    }
  });
}

/**
 * Retries callback several times.
 *
 * @param callback - Callback.
 */
async function retry(callback) {
  let retries = 50;

  await attempt();

  async function attempt() {
    try {
      await callback();
    } catch (e) {
      if (retries) {
        retries--;
        setTimeout(attempt, 50);
      } else throw e;
    }
  }
}

/**
 * Checks if trap is installed.
 *
 * @param window - Window.
 * @returns _True_ if trap is installed, _false_ otherwise.
 */
function trapInstalled(window) {
  if (window.tabs.length >= 1) {
    const tab = window.tabs[0];

    return tab.url === "about:blank" && tab.pinned;
  }

  return false;
}
