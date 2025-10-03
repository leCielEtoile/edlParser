// ダークモード切替ユーティリティ - ホームページとアプリページで共通利用

/**
 * ダークモードを初期化
 * @param {string} toggleButtonId - トグルボタンのID
 */
export const initDarkMode = (toggleButtonId = 'toggleDarkMode') => {
  const toggleButton = document.getElementById(toggleButtonId);
  if (!toggleButton) {
    console.warn(`ダークモードボタン (#${toggleButtonId}) が見つかりません`);
    return;
  }

  // クリックイベント
  toggleButton.addEventListener('click', () => {
    toggleDarkMode(toggleButton);
  });

  // 初期状態を復元
  restoreDarkMode(toggleButton);

  // メディアクエリの変更を監視
  watchSystemPreference(toggleButton);
};

/**
 * ダークモードを切り替え
 * @param {HTMLElement} toggleButton - トグルボタン要素
 */
export const toggleDarkMode = (toggleButton) => {
  document.documentElement.classList.toggle('dark');

  if (document.documentElement.classList.contains('dark')) {
    toggleButton.innerHTML = '<i class="fas fa-sun"></i>';
    toggleButton.title = "ライトモード切替";
    localStorage.setItem('darkMode', 'enabled');
  } else {
    toggleButton.innerHTML = '<i class="fas fa-moon"></i>';
    toggleButton.title = "ダークモード切替";
    localStorage.setItem('darkMode', 'disabled');
  }
};

/**
 * ダークモード設定を復元
 * @param {HTMLElement} toggleButton - トグルボタン要素
 */
export const restoreDarkMode = (toggleButton) => {
  const darkModeEnabled = localStorage.getItem('darkMode') === 'enabled';
  const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const noPreference = !localStorage.getItem('darkMode');

  if (darkModeEnabled || (systemPrefersDark && noPreference)) {
    document.documentElement.classList.add('dark');
    toggleButton.innerHTML = '<i class="fas fa-sun"></i>';
    toggleButton.title = "ライトモード切替";
  } else {
    document.documentElement.classList.remove('dark');
    toggleButton.innerHTML = '<i class="fas fa-moon"></i>';
    toggleButton.title = "ダークモード切替";
  }
};

/**
 * システムのダークモード設定変更を監視
 * @param {HTMLElement} toggleButton - トグルボタン要素
 */
export const watchSystemPreference = (toggleButton) => {
  const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const handler = (e) => {
    // ユーザーが明示的に設定していない場合のみシステム設定に従う
    if (!localStorage.getItem('darkMode')) {
      if (e.matches) {
        document.documentElement.classList.add('dark');
        toggleButton.innerHTML = '<i class="fas fa-sun"></i>';
        toggleButton.title = "ライトモード切替";
      } else {
        document.documentElement.classList.remove('dark');
        toggleButton.innerHTML = '<i class="fas fa-moon"></i>';
        toggleButton.title = "ダークモード切替";
      }
    }
  };

  // モダンブラウザ用
  if (darkModeMediaQuery.addEventListener) {
    darkModeMediaQuery.addEventListener('change', handler);
  }
  // Safari用のフォールバック
  else if (darkModeMediaQuery.addListener) {
    darkModeMediaQuery.addListener(handler);
  }
};

/**
 * ダークモードの状態を取得
 * @returns {boolean} - ダークモードが有効かどうか
 */
export const isDarkModeEnabled = () => {
  return document.documentElement.classList.contains('dark');
};
