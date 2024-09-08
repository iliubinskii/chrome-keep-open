(() => {
  const MAX_RETRIES = 50;

  const RETRY_TIMEOUT_MS = 50;

  let handlingEvent = 0;

  /**
   * @type {Set<number>}
   */
  const windowsWithTrap = new Set();

  importScripts("browser-polyfill.js");

  /* eslint-disable @typescript-eslint/no-misused-promises -- Ok */

  browser.tabs.onActivated.addListener(handleEvent);
  browser.tabs.onAttached.addListener(handleEvent);
  browser.tabs.onMoved.addListener(handleEvent);
  browser.tabs.onRemoved.addListener(onRemoved);
  browser.tabs.onUpdated.addListener(onUpdated);

  /* eslint-enable @typescript-eslint/no-misused-promises -- Ok */

  /**
   * Handles Chrome event.
   * @param {number} _tabId - Tab ID.
   * @param {browser.tabs._OnRemovedRemoveInfo} info - Info.
   */
  async function onRemoved(_tabId, info) {
    const { windowId } = info;

    windowsWithTrap.delete(windowId);

    await handleEvent();
  }

  /**
   * Handles Chrome event.
   * @param {number} _tabId - Tab ID.
   * @param {browser.tabs._OnUpdatedChangeInfo} _info - Info.
   * @param {browser.tabs.Tab} tab - Tab.
   */
  async function onUpdated(_tabId, _info, tab) {
    const { windowId = -1 } = tab;

    windowsWithTrap.delete(windowId);

    await handleEvent();
  }

  /**
   * Handles Chrome event.
   */
  async function handleEvent() {
    if (handlingEvent) return;

    handlingEvent++;

    try {
      const windows = await chrome.windows.getAll({
        populate: true,
        windowTypes: ["normal"]
      });

      await Promise.allSettled(windows.map(updateWindow));
    } finally {
      handlingEvent--;
    }
  }

  /**
   * Updates window.
   * @param {chrome.windows.Window} wnd - Window.
   */
  async function updateWindow(wnd) {
    await createTrap(wnd);
    await createUnpinnedTab(wnd);
    await fadeTrap(wnd);
    await removeUnnecessaryNewTabs(wnd);
  }

  /**
   * Creates trap tab if it's missing.
   * @param {chrome.windows.Window} wnd - Window.
   */
  async function createTrap(wnd) {
    await withRetries(async () => {
      if (trapInstalledOrNotNeeded(wnd)) {
        // Skip
      } else {
        const { id } = wnd;

        if (id) {
          await browser.tabs.create({
            active: false,
            index: 0,
            pinned: true,
            url: "about:blank",
            windowId: id
          });

          windowsWithTrap.add(id);
        }
      }
    });
  }

  /**
   * Creates unpinned tab if it's missing.
   * @param {chrome.windows.Window} wnd - Window.
   */
  async function createUnpinnedTab(wnd) {
    await withRetries(async () => {
      if (trapFocused(wnd) && wnd.tabs && wnd.tabs.every(tab => tab.pinned))
        await browser.tabs.create({
          url: "chrome://newtab/",
          windowId: wnd.id
        });
    });
  }

  /**
   * Fades trap if it's focused.
   * @param {chrome.windows.Window} wnd - Window.
   */
  async function fadeTrap(wnd) {
    await withRetries(async () => {
      if (trapFocused(wnd) && wnd.tabs) {
        const unpinnedTab = wnd.tabs.find(tab => !tab.pinned);

        if (unpinnedTab && unpinnedTab.id)
          await browser.tabs.update(unpinnedTab.id, { active: true });
      }
    });
  }

  /**
   * Removes unnecessary new tabs leaving only the last one.
   * @param {chrome.windows.Window} wnd - Window.
   */
  async function removeUnnecessaryNewTabs(wnd) {
    await withRetries(async () => {
      if (wnd.tabs) {
        const tabs = wnd.tabs
          .slice(0, -1)
          .filter(
            tab =>
              tab.url === "chrome://newtab/" &&
              tab.status === "complete" &&
              !tab.active &&
              !tab.pinned
          );

        await Promise.allSettled(
          tabs.map(async tab => {
            if (tab.id) await browser.tabs.remove(tab.id);
          })
        );
      }
    });
  }

  /**
   * Retries callback several times.
   * @param {() => Promise<void>} callback - Callback.
   */
  async function withRetries(callback) {
    let retries = MAX_RETRIES;

    await retry();

    /**
     * Attempts to execute callback.
     */
    async function retry() {
      try {
        await callback();
      } catch (err) {
        if (retries) {
          retries--;

          // eslint-disable-next-line @typescript-eslint/no-misused-promises -- Ok
          setTimeout(retry, RETRY_TIMEOUT_MS);
        } else throw err;
      }
    }
  }

  /**
   * Checks if trap is focused.
   * @param {chrome.windows.Window} wnd - Window.
   * @returns {boolean} _True_ if trap is installed, _false_ otherwise.
   */
  function trapFocused(wnd) {
    if (
      wnd.tabs &&
      wnd.tabs.some(
        tab =>
          tab.active &&
          tab.pinned &&
          tab.url === "about:blank" &&
          tab.status === "complete"
      )
    )
      return true;

    return false;
  }

  /**
   * Checks if trap is installed or not needed.
   * @param {chrome.windows.Window} wnd - Window.
   * @returns {boolean} _True_ if trap is installed or not needed, _false_ otherwise.
   */
  function trapInstalledOrNotNeeded(wnd) {
    // Trap is installed based on flag being set
    if (wnd.id && windowsWithTrap.has(wnd.id)) return true;

    // Trap is not needed when it's not the last tab
    if (wnd.tabs && wnd.tabs.length > 1) return true;

    // Trap is not needed when there are pinned tabs
    if (wnd.tabs && wnd.tabs.some(tab => tab.pinned)) return true;

    return false;
  }
})();
