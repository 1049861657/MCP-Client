/**
 * 聊天应用工具模块：供应商切换等事件增强
 */

/**
 * @param {object} app
 * @returns {{ init: () => void, initEvents: () => void }}
 */
export function createChatUtils(app) {
  function initEvents() {
    if (!app.elements.provider) {
      return;
    }

    const existingHandler = app.elements.provider.onchange;
    app.elements.provider.onchange = (event) => {
      if (existingHandler) {
        existingHandler.call(app.elements.provider, event);
      }

      if (app.elements.chatMessages) {
        app.elements.chatMessages.innerHTML = '';
      }

      app.state.messageHistory = [];

      const newProvider = app.elements.provider.value;
      const providerText =
        app.elements.provider.options[app.elements.provider.selectedIndex]?.text ||
        '未知供应商';
      console.log(`已切换到供应商: ${newProvider} (${providerText})`);

      if (app.data?.db?.isReady) {
        console.log('供应商已切换，尝试加载该供应商的最新会话');
        app.data
          .loadLatestProviderSession()
          .then(() => {
            app.updateSessionDisplay();
          })
          .catch((error) => {
            console.error('自动加载最新会话失败:', error);
            app.data.createNewSession();
          });
      } else {
        console.log('数据库未就绪，创建新会话');
        app.data?.createNewSession?.();
      }

      app.ui?.showTooltip?.(`已切换到 ${providerText}`);
    };

    console.log('工具模块事件增强功能初始化完成');
  }

  function init() {
    console.log('初始化工具模块...');
    initEvents();
  }

  return {
    init,
    initEvents,
  };
}
