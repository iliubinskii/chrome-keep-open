(() => {
  const RETRY_TIMEOUT_MS = 50;

  let handling = 0;

  importScripts("browser-polyfill.js");
  // eslint-disable-next-line @typescript-eslint/no-misused-promises -- Ok
  browser.tabs.onActivated.addListener(handleEvent);
  // eslint-disable-next-line @typescript-eslint/no-misused-promises -- Ok
  browser.tabs.onAttached.addListener(handleEvent);
  // eslint-disable-next-line @typescript-eslint/no-misused-promises -- Ok
  browser.tabs.onMoved.addListener(handleEvent);
  // eslint-disable-next-line @typescript-eslint/no-misused-promises -- Ok
  browser.tabs.onRemoved.addListener(handleEvent);
  // eslint-disable-next-line @typescript-eslint/no-misused-promises -- Ok
  browser.tabs.onUpdated.addListener(handleEvent);

  /**
   * Creates second tab.
   * @param {chrome.windows.Window} wnd - Window.
   */
  async function createSecondTab(wnd) {
    await retry(async () => {
      if (trapInstalled(wnd) && wnd.tabs && wnd.tabs.length === 1)
        await browser.tabs.create({
          url: "chrome://newtab/",
          windowId: wnd.id
        });
    });
  }

  /**
   * Creates trap.
   * @param {chrome.windows.Window} wnd - Window.
   */
  async function createTrap(wnd) {
    await retry(async () => {
      if (wnd.tabs && wnd.tabs.some(tab => tab.pinned)) {
        // Do not create trap if there are already pinned tabs
      } else
        await browser.tabs.create({
          active: false,
          index: 0,
          pinned: true,
          url: "about:blank",
          windowId: wnd.id
        });
    });
  }

  /**
   * Fade trap.
   * @param {chrome.windows.Window} wnd - Window.
   */
  async function fadeTrap(wnd) {
    await retry(async () => {
      if (trapInstalled(wnd) && wnd.tabs && wnd.tabs.length >= 2) {
        const tab = wnd.tabs[0];

        if (tab && tab.active) {
          const secondTab = wnd.tabs[1];

          if (secondTab && typeof secondTab.id === "number")
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
   * @param {chrome.windows.Window} wnd - Window.
   */
  async function handleWindow(wnd) {
    await createTrap(wnd);
    await createSecondTab(wnd);
    await fadeTrap(wnd);
    await removeUnnecessaryNewTabs(wnd);
  }

  /**
   * Removes unnecessary new tabs.
   * @param {chrome.windows.Window} wnd - Window.
   */
  async function removeUnnecessaryNewTabs(wnd) {
    await retry(async () => {
      if (trapInstalled(wnd) && wnd.tabs) {
        const tabs = wnd.tabs
          .slice(0, -1)
          .filter(
            tab =>
              tab.url === "chrome://newtab/" &&
              tab.status === "complete" &&
              !tab.active &&
              !tab.pinned
          );

        await Promise.all(
          tabs.map(async tab => {
            if (typeof tab.id === "number") await browser.tabs.remove(tab.id);
          })
        );
      }
    });
  }

  /**
   * Retries callback several times.
   * @param {() => Promise<void>} callback - Callback.
   */
  async function retry(callback) {
    let retries = 50;

    await attempt();

    /**
     * Attempts to execute callback.
     */
    async function attempt() {
      try {
        await callback();
      } catch (err) {
        if (retries) {
          retries--;
          // eslint-disable-next-line @typescript-eslint/no-misused-promises -- Ok
          setTimeout(attempt, RETRY_TIMEOUT_MS);
        } else throw err;
      }
    }
  }

  /**
   * Checks if trap is installed.
   * @param {chrome.windows.Window} wnd - Window.
   * @returns _True_ if trap is installed, _false_ otherwise.
   */
  function trapInstalled(wnd) {
    if (wnd.tabs && wnd.tabs.length > 0) {
      const tab = wnd.tabs[0];

      return tab && tab.url === "about:blank" && tab.pinned;
    }

    return false;
  }
})();
