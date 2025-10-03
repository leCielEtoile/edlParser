// メッセージ表示ユーティリティ

/**
 * メッセージを表示
 * @param {string} message - 表示するメッセージ
 * @param {string} type - メッセージタイプ ('success' | 'error')
 */
export const showMessage = (message, type = 'success') => {
  const messageEl = document.getElementById('message');
  if (!messageEl) return;

  messageEl.textContent = message;
  messageEl.className = type;
  messageEl.style.display = 'block';

  // アクセシビリティ対応
  messageEl.setAttribute('role', 'alert');

  // 5秒後に消える
  setTimeout(() => {
    messageEl.style.display = 'none';
    messageEl.removeAttribute('role');
  }, 5000);
};

/**
 * メッセージを即座に非表示
 */
export const hideMessage = () => {
  const messageEl = document.getElementById('message');
  if (!messageEl) return;

  messageEl.style.display = 'none';
  messageEl.removeAttribute('role');
};
