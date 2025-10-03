// チャプターリスト表示・編集ユーティリティ

import { stringToChapters } from '../utils/chapter-operations.js';

/**
 * HTMLエスケープ（XSS対策）
 * @param {string} unsafe - エスケープする文字列
 * @returns {string} - エスケープされた文字列
 */
export const escapeHtml = (unsafe) => {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

/**
 * リップルエフェクトを作成
 * @param {MouseEvent} event - マウスイベント
 */
export const createRipple = (event) => {
  const button = event.currentTarget;
  if (!button) return;

  const ripple = document.createElement('span');
  const rect = button.getBoundingClientRect();

  const diameter = Math.max(rect.width, rect.height);
  const radius = diameter / 2;

  ripple.style.width = ripple.style.height = `${diameter}px`;
  ripple.style.left = `${event.clientX - rect.left - radius}px`;
  ripple.style.top = `${event.clientY - rect.top - radius}px`;
  ripple.className = 'ripple';

  // 既存のリップルがあれば削除
  const existingRipple = button.querySelector('.ripple');
  if (existingRipple) {
    existingRipple.remove();
  }

  button.appendChild(ripple);

  // アニメーション終了時に要素を削除
  setTimeout(() => {
    ripple.remove();
  }, 600);
};

/**
 * チャプターリストを更新
 * @param {Object} state - アプリケーション状態
 * @param {Object} handlers - イベントハンドラ
 */
export const updateChapterList = (state, handlers) => {
  const editorEl = document.getElementById('editor');
  const chapterListEl = document.getElementById('chapterList');

  if (!editorEl || !chapterListEl) return;

  try {
    const chapters = stringToChapters(editorEl.value);
    state.chapters = chapters;

    // チャプターリストをクリア
    chapterListEl.innerHTML = '';

    if (chapters.length === 0) {
      chapterListEl.innerHTML =
        `<div class="empty-state">
          <p>チャプターがありません。ファイルをアップロードするか、新しいチャプターを追加してください。</p>
        </div>`;
      return;
    }

    // 各チャプターをリストに追加
    chapters.forEach((chapter, index) => {
      const chapterItem = document.createElement('div');
      chapterItem.className = 'chapter-item';
      chapterItem.dataset.index = index;

      chapterItem.innerHTML = `
        <div class="chapter-time">${chapter.time}</div>
        <div class="chapter-title">${escapeHtml(chapter.name)}</div>
        <div class="chapter-actions">
          <button class="icon-button edit-button" aria-label="チャプターを編集" title="編集">
            <i class="fas fa-edit"></i>
          </button>
          <button class="icon-button delete-button" aria-label="チャプターを削除" title="削除">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      `;

      // 編集ボタンのイベントリスナー
      const editButton = chapterItem.querySelector('.edit-button');
      if (editButton && handlers.onEdit) {
        editButton.addEventListener('click', (e) => {
          e.stopPropagation();
          handlers.onEdit(index);
          createRipple(e);
        });
      }

      // 削除ボタンのイベントリスナー
      const deleteButton = chapterItem.querySelector('.delete-button');
      if (deleteButton && handlers.onDelete) {
        deleteButton.addEventListener('click', (e) => {
          e.stopPropagation();
          handlers.onDelete(index);
          createRipple(e);
        });
      }

      // チャプター項目全体のクリックでも編集モーダルを開く
      if (handlers.onEdit) {
        chapterItem.addEventListener('click', () => {
          handlers.onEdit(index);
        });
      }

      chapterListEl.appendChild(chapterItem);
    });
  } catch (error) {
    console.error("チャプターリスト更新エラー:", error);
  }
};

/**
 * リップルエフェクトを要素に追加
 * @param {HTMLElement|NodeList|Array} elements - 要素または要素のリスト
 */
export const addRippleEffect = (elements) => {
  if (!elements) return;

  if (elements instanceof HTMLElement) {
    elements.addEventListener('click', createRipple);
  } else if (elements instanceof NodeList || Array.isArray(elements)) {
    elements.forEach(element => {
      element.addEventListener('click', createRipple);
    });
  }
};
