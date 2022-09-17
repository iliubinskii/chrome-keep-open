/* eslint-disable no-await-in-loop -- Ok */

let handling = 0;

importScripts("browser-polyfill.js");
browser.tabs.onActivated.addListener(handleEvent);
browser.tabs.onAttached.addListener(handleEvent);
browser.tabs.onMoved.addListener(handleEvent);
browser.tabs.onRemoved.addListener(handleEvent);
browser.tabs.onUpdated.addListener(handleEvent);
browser.windows.onRemoved.addListener(handleEvent);

/**
 * Creates pinned tab.
 *
 * @param window - Window.
 */
async function createPinnedTab(window) {
  const pinnedTabs = await chrome.tabs.query({
    pinned: true,
    windowId: window.id
  });

  if (pinnedTabs.length < 1)
    await browser.tabs.create({
      active: false,
      index: 0,
      pinned: true,
      url: "about:blank",
      windowId: window.id
    });
}

/**
 * Creates second tab.
 *
 * @param window - Window.
 */
async function createSecondTab(window) {
  if (window.tabs.length < 2) {
    const firstTab = await browser.tabs.get(window.tabs[0].id);

    if (
      window.tabs.length < 2 &&
      firstTab.pinned &&
      firstTab.url === "about:blank"
    )
      await browser.tabs.create({
        url: "chrome://newtab/",
        windowId: window.id
      });
  }
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

    for (const window of windows) {
      await createPinnedTab(window);
      await createSecondTab(window);
      await preventOpeningFirstTab(window);
    }
  } finally {
    handling--;
  }
}

/**
 * Prevents opening first tab.
 *
 * @param window - Window.
 */
async function preventOpeningFirstTab(window) {
  let retries = 50;

  await attempt();

  async function attempt() {
    if (window.tabs.length >= 2) {
      const firstTab = await browser.tabs.get(window.tabs[0].id);

      if (
        window.tabs.length >= 2 &&
        firstTab.active &&
        firstTab.pinned &&
        firstTab.url === "about:blank"
      )
        try {
          await browser.tabs.update(window.tabs[1].id, { active: true });
        } catch {
          if (retries > 0) {
            retries--;
            setTimeout(attempt, 50);
          }
        }
    }
  }
}
