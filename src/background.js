(() => {
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
   * @param wnd - Window.
   */
  async function createSecondTab(wnd) {
    await retry(async () => {
      if (trapInstalled(wnd) && wnd.tabs.length === 1)
        await browser.tabs.create({
          url: "chrome://newtab/",
          windowId: wnd.id
        });
    });
  }

  /**
   * Creates trap.
   *
   * @param wnd - Window.
   */
  async function createTrap(wnd) {
    await retry(async () => {
      if (wnd.tabs.some(tab => tab.pinned)) {
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
   * Fades trap.
   *
   * @param wnd - Window.
   */
  async function fadeTrap(wnd) {
    await retry(async () => {
      if (trapInstalled(wnd) && wnd.tabs.length >= 2) {
        const tab = wnd.tabs[0];

        if (tab.active) {
          const secondTab = wnd.tabs[1];

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
   * @param wnd - Window.
   */
  async function handleWindow(wnd) {
    await createTrap(wnd);
    await createSecondTab(wnd);
    await fadeTrap(wnd);
    await removeUnnecessaryNewTabs(wnd);
  }

  /**
   * Removes unnecessary new tabs.
   *
   * @param wnd - Window.
   */
  async function removeUnnecessaryNewTabs(wnd) {
    await retry(async () => {
      if (trapInstalled(wnd)) {
        const tabs = wnd.tabs
          .slice(0, -1)
          .filter(
            tab =>
              tab.url === "chrome://newtab/" &&
              tab.status === "complete" &&
              !tab.active &&
              !tab.pinned
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
   * @param wnd - Window.
   * @returns _True_ if trap is installed, _false_ otherwise.
   */
  function trapInstalled(wnd) {
    if (wnd.tabs.length >= 1) {
      const tab = wnd.tabs[0];

      return tab.url === "about:blank" && tab.pinned;
    }

    return false;
  }
})();
