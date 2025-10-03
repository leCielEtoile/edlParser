// モーダル管理ユーティリティ

/**
 * モーダルを表示
 * @param {HTMLElement} modal - モーダル要素
 */
export const showModal = (modal) => {
  if (!modal) return;

  modal.classList.add('active');
  const firstInput = modal.querySelector('input');
  if (firstInput) {
    setTimeout(() => {
      firstInput.focus();
    }, 100);
  }

  // ESCキーでモーダルを閉じる
  document.addEventListener('keydown', handleModalEscapeKey);

  // スクロール防止
  document.body.style.overflow = 'hidden';
};

/**
 * モーダルを非表示
 * @param {HTMLElement} modal - モーダル要素
 */
export const hideModal = (modal) => {
  if (!modal) return;

  modal.classList.remove('active');
  document.removeEventListener('keydown', handleModalEscapeKey);

  // スクロール再開
  document.body.style.overflow = '';
};

/**
 * ESCキーでモーダルを閉じるハンドラ
 * @param {KeyboardEvent} event - キーボードイベント
 */
const handleModalEscapeKey = (event) => {
  if (event.key === 'Escape') {
    const activeModal = document.querySelector('.modal.active');
    if (activeModal) {
      hideModal(activeModal);
    }
  }
};

/**
 * モーダルイベントリスナーをセットアップ
 */
export const setupModalListeners = () => {
  // モーダル閉じるボタン
  document.querySelectorAll('.close-button, .close-modal, .cancel-modal').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modal = e.target.closest('.modal');
      if (modal) {
        hideModal(modal);
      }
    });
  });

  // モーダル外クリックで閉じる
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        hideModal(modal);
      }
    });
  });
};
