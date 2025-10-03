// YouTubeチャプター変換ツール - メインアプリケーション

import { detectFileFormat, PARSERS, getFormatDisplayName } from './utils/parsers.js';
import { chaptersToString, stringToChapters, shiftChapterTimes, formatChapters, sortChaptersByTime, isValidTimeFormat } from './utils/chapter-operations.js';
import { showModal, hideModal, setupModalListeners } from './ui/modal.js';
import { showMessage } from './ui/message.js';
import { updateChapterList, addRippleEffect } from './ui/chapter-list.js';
import { initDarkMode } from '../components/dark-mode.js';

// アプリケーション状態
const state = {
  isShifted: false,
  lastMode: null,
  chapters: []
};

// DOM要素キャッシュ
const DOM = {
  fileInput: document.getElementById('fileInput'),
  dropArea: document.getElementById('dropArea'),
  pasteInput: document.getElementById('pasteInput'),
  clearPasteInput: document.getElementById('clearPasteInput'),
  convertButton: document.getElementById('convertButton'),
  editor: document.getElementById('editor'),
  clearEditor: document.getElementById('clearEditor'),
  chapterList: document.getElementById('chapterList'),
  addChapterButton: document.getElementById('addChapterButton'),
  shiftButton: document.getElementById('shiftButton'),
  formatButton: document.getElementById('formatButton'),
  downloadButton: document.getElementById('downloadButton'),
  copyButton: document.getElementById('copyButton'),
  keyboardShortcuts: document.getElementById('keyboardShortcuts'),
  shortcutsModal: document.getElementById('shortcutsModal'),
  addChapterModal: document.getElementById('addChapterModal'),
  editChapterModal: document.getElementById('editChapterModal'),
  chapterTime: document.getElementById('chapterTime'),
  chapterTitle: document.getElementById('chapterTitle'),
  editChapterTime: document.getElementById('editChapterTime'),
  editChapterTitle: document.getElementById('editChapterTitle'),
  editChapterIndex: document.getElementById('editChapterIndex'),
  saveNewChapter: document.getElementById('saveNewChapter'),
  updateChapter: document.getElementById('updateChapter')
};

// コンテンツを解析してチャプターに変換
const parseContent = (content, filename = '') => {
  if (!content || !content.trim()) {
    throw new Error("コンテンツが空です");
  }

  const format = detectFileFormat(content, filename);
  if (!format) {
    throw new Error("ファイル形式を認識できませんでした");
  }

  state.lastMode = format;
  const parser = PARSERS[format];

  if (!parser) {
    throw new Error("未対応のファイル形式です");
  }

  const chapters = parser(content);

  if (chapters.length === 0) {
    throw new Error("チャプター情報が見つかりませんでした");
  }

  return sortChaptersByTime(chapters);
};

// イベントハンドラ: ドラッグ＆ドロップ
const handleDragOver = (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (DOM.dropArea) DOM.dropArea.classList.add('dragover');
};

const handleDragLeave = (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (DOM.dropArea) DOM.dropArea.classList.remove('dragover');
};

const handleDrop = (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (DOM.dropArea) DOM.dropArea.classList.remove('dragover');

  const files = e.dataTransfer.files;
  if (files.length > 0 && DOM.fileInput) {
    DOM.fileInput.files = files;
    handleFileUpload();
  }
};

const handleDropAreaClick = () => {
  if (DOM.fileInput) {
    DOM.fileInput.click();
  }
};

// イベントハンドラ: ファイルアップロード
const handleFileUpload = () => {
  if (!DOM.fileInput) return;

  const file = DOM.fileInput.files[0];
  if (!file) return;

  const reader = new FileReader();

  if (DOM.dropArea) DOM.dropArea.classList.add('processing');

  reader.onload = (e) => {
    try {
      const content = e.target.result;
      const chapters = parseContent(content, file.name);
      if (DOM.editor) DOM.editor.value = chaptersToString(chapters);
      updateChapterList(state, { onEdit: handleEditChapter, onDelete: handleDeleteChapter });

      showMessage(`ファイルを変換しました！（形式: ${getFormatDisplayName(state.lastMode)}）`);
    } catch (error) {
      showMessage(`エラー：${error.message}`, "error");
      if (DOM.editor) DOM.editor.value = "";
      updateChapterList(state, { onEdit: handleEditChapter, onDelete: handleDeleteChapter });
    } finally {
      if (DOM.dropArea) DOM.dropArea.classList.remove('processing');
    }
  };

  reader.onerror = () => {
    showMessage("ファイルの読み込みに失敗しました", "error");
    if (DOM.dropArea) DOM.dropArea.classList.remove('processing');
  };

  reader.readAsText(file);
};

// イベントハンドラ: コピペテキスト変換
const handleConvertPasted = () => {
  if (!DOM.pasteInput || !DOM.editor) return;

  const content = DOM.pasteInput.value;

  try {
    const chapters = parseContent(content);
    DOM.editor.value = chaptersToString(chapters);
    updateChapterList(state, { onEdit: handleEditChapter, onDelete: handleDeleteChapter });

    showMessage(`コピペ入力を変換しました！（形式: ${getFormatDisplayName(state.lastMode)}）`);
  } catch (error) {
    showMessage(`エラー：${error.message}`, "error");
    DOM.editor.value = "";
    updateChapterList(state, { onEdit: handleEditChapter, onDelete: handleDeleteChapter });
  }
};

// イベントハンドラ: 入力クリア
const handleClearPasteInput = () => {
  if (!DOM.pasteInput) return;
  DOM.pasteInput.value = '';
  DOM.pasteInput.focus();
};

const handleClearEditor = () => {
  if (!DOM.editor) return;
  DOM.editor.value = '';
  updateChapterList(state, { onEdit: handleEditChapter, onDelete: handleDeleteChapter });
  DOM.editor.focus();
};

// イベントハンドラ: チャプター追加
const handleAddChapter = () => {
  if (!DOM.chapterTime || !DOM.chapterTitle || !DOM.addChapterModal) return;

  DOM.chapterTime.value = '';
  DOM.chapterTitle.value = '';
  showModal(DOM.addChapterModal);
};

const handleSaveNewChapter = () => {
  if (!DOM.chapterTime || !DOM.chapterTitle || !DOM.editor) return;

  const time = DOM.chapterTime.value.trim();
  const title = DOM.chapterTitle.value.trim();

  if (!time || !title) {
    showMessage("時間とタイトルを入力してください", "error");
    return;
  }

  if (!isValidTimeFormat(time)) {
    showMessage("時間は00:00:00の形式で入力してください", "error");
    return;
  }

  const currentChapters = stringToChapters(DOM.editor.value);
  const newChapter = { time, name: title };
  const chapters = [...currentChapters, newChapter];
  const sortedChapters = sortChaptersByTime(chapters);

  DOM.editor.value = chaptersToString(sortedChapters);
  updateChapterList(state, { onEdit: handleEditChapter, onDelete: handleDeleteChapter });

  hideModal(DOM.addChapterModal);
  showMessage("チャプターを追加しました");
};

// イベントハンドラ: チャプター編集
const handleEditChapter = (index) => {
  if (!DOM.editor || !DOM.editChapterTime || !DOM.editChapterTitle || !DOM.editChapterIndex || !DOM.editChapterModal) return;

  const chapters = stringToChapters(DOM.editor.value);

  if (index < 0 || index >= chapters.length) return;

  const chapter = chapters[index];

  DOM.editChapterTime.value = chapter.time;
  DOM.editChapterTitle.value = chapter.name;
  DOM.editChapterIndex.value = index;

  showModal(DOM.editChapterModal);
};

const handleUpdateChapter = () => {
  if (!DOM.editChapterIndex || !DOM.editChapterTime || !DOM.editChapterTitle || !DOM.editor || !DOM.editChapterModal) return;

  const index = parseInt(DOM.editChapterIndex.value);
  const time = DOM.editChapterTime.value.trim();
  const title = DOM.editChapterTitle.value.trim();

  const chapters = stringToChapters(DOM.editor.value);

  if (isNaN(index) || index < 0 || index >= chapters.length) {
    showMessage("エラー：編集対象のチャプターが見つかりません", "error");
    return;
  }

  if (!time || !title) {
    showMessage("時間とタイトルを入力してください", "error");
    return;
  }

  if (!isValidTimeFormat(time)) {
    showMessage("時間は00:00:00の形式で入力してください", "error");
    return;
  }

  const updatedChapters = [...chapters];
  updatedChapters[index] = { time, name: title };

  const sortedChapters = sortChaptersByTime(updatedChapters);

  DOM.editor.value = chaptersToString(sortedChapters);
  updateChapterList(state, { onEdit: handleEditChapter, onDelete: handleDeleteChapter });

  hideModal(DOM.editChapterModal);
  showMessage("チャプターを更新しました");
};

// イベントハンドラ: チャプター削除
const handleDeleteChapter = (index) => {
  if (!DOM.editor) return;

  const chapters = stringToChapters(DOM.editor.value);

  if (index < 0 || index >= chapters.length) return;

  if (!confirm(`チャプター「${chapters[index].time} ${chapters[index].name}」を削除しますか？`)) {
    return;
  }

  const updatedChapters = [...chapters];
  updatedChapters.splice(index, 1);

  DOM.editor.value = chaptersToString(updatedChapters);
  updateChapterList(state, { onEdit: handleEditChapter, onDelete: handleDeleteChapter });

  showMessage("チャプターを削除しました");
};

// イベントハンドラ: 時間補正
const handleTimeShift = () => {
  if (!DOM.editor || !DOM.shiftButton) return;

  try {
    const chapters = stringToChapters(DOM.editor.value);

    if (chapters.length === 0) {
      showMessage("補正するチャプターがありません", "error");
      return;
    }

    const shiftedChapters = shiftChapterTimes(chapters, !state.isShifted);
    DOM.editor.value = chaptersToString(shiftedChapters);
    updateChapterList(state, { onEdit: handleEditChapter, onDelete: handleDeleteChapter });

    state.isShifted = !state.isShifted;
    DOM.shiftButton.innerHTML = state.isShifted ?
      '<i class="fas fa-clock"></i> 補正を元に戻す' :
      '<i class="fas fa-clock"></i> 00:00:00開始に補正';

    showMessage(state.isShifted ? "チャプター時間を1時間戻しました" : "チャプター時間を元に戻しました");
  } catch (error) {
    showMessage(`エラー：${error.message}`, "error");
  }
};

// イベントハンドラ: フォーマット整形
const handleFormat = () => {
  if (!DOM.editor) return;

  try {
    const chapters = stringToChapters(DOM.editor.value);

    if (chapters.length === 0) {
      showMessage("整形するチャプターがありません", "error");
      return;
    }

    const formattedChapters = formatChapters(chapters);
    DOM.editor.value = chaptersToString(formattedChapters);
    updateChapterList(state, { onEdit: handleEditChapter, onDelete: handleDeleteChapter });

    showMessage("チャプターを整形しました");
  } catch (error) {
    showMessage(`エラー：${error.message}`, "error");
  }
};

// イベントハンドラ: ダウンロード
const handleDownload = () => {
  if (!DOM.editor) return;

  const text = DOM.editor.value;

  if (!text.trim()) {
    showMessage("ダウンロードする内容が空です", "error");
    return;
  }

  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');

  a.href = url;
  a.download = "youtube-chapters.txt";
  a.click();

  URL.revokeObjectURL(url);
  showMessage("チャプターファイルをダウンロードしました！");
};

// イベントハンドラ: クリップボードにコピー
const handleCopy = () => {
  if (!DOM.editor) return;

  const text = DOM.editor.value;

  if (!text.trim()) {
    showMessage("コピーする内容が空です", "error");
    return;
  }

  navigator.clipboard.writeText(text)
    .then(() => {
      showMessage("チャプターをクリップボードにコピーしました！");
    })
    .catch(err => {
      showMessage(`コピーに失敗しました：${err}`, "error");
    });
};

// イベントハンドラ: エディタ変更
const handleEditorChange = () => {
  updateChapterList(state, { onEdit: handleEditChapter, onDelete: handleDeleteChapter });
};

// イベントハンドラ: ショートカットモーダル
const handleShowShortcutsModal = () => {
  if (DOM.shortcutsModal) {
    showModal(DOM.shortcutsModal);
  }
};

// イベントハンドラ: キーボードショートカット
const handleKeyboardShortcuts = (event) => {
  if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
    return;
  }

  if (document.querySelector('.modal.active')) {
    return;
  }

  if (event.ctrlKey && event.key === 's') {
    event.preventDefault();
    handleDownload();
    return;
  }

  if (event.ctrlKey && event.key === 'c' && document.activeElement !== DOM.editor) {
    event.preventDefault();
    handleCopy();
    return;
  }

  if (event.ctrlKey && event.key === 'f') {
    event.preventDefault();
    handleFormat();
    return;
  }

  if (event.ctrlKey && event.key === 't') {
    event.preventDefault();
    handleTimeShift();
    return;
  }

  if (event.altKey && event.key === 'a') {
    event.preventDefault();
    handleAddChapter();
    return;
  }

  if (event.altKey && event.key === 'd') {
    event.preventDefault();
    const toggleButton = document.getElementById('toggleDarkMode');
    if (toggleButton) toggleButton.click();
    return;
  }
};

// アプリケーション初期化
const init = () => {
  try {
    console.log("YouTubeチャプターツール初期化開始");

    // ダークモード初期化
    initDarkMode('toggleDarkMode');

    // ドラッグ＆ドロップイベント
    if (DOM.dropArea) {
      DOM.dropArea.addEventListener('dragover', handleDragOver);
      DOM.dropArea.addEventListener('dragleave', handleDragLeave);
      DOM.dropArea.addEventListener('drop', handleDrop);
      DOM.dropArea.addEventListener('click', handleDropAreaClick);
      DOM.dropArea.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleDropAreaClick();
        }
      });
    }

    // ファイル入力
    if (DOM.fileInput) {
      DOM.fileInput.addEventListener('change', handleFileUpload);
    }

    // テキスト入力と変換
    if (DOM.clearPasteInput) {
      DOM.clearPasteInput.addEventListener('click', handleClearPasteInput);
    }

    if (DOM.convertButton) {
      DOM.convertButton.addEventListener('click', handleConvertPasted);
    }

    // エディタ操作
    if (DOM.clearEditor) {
      DOM.clearEditor.addEventListener('click', handleClearEditor);
    }

    if (DOM.editor) {
      DOM.editor.addEventListener('input', handleEditorChange);
    }

    // チャプター操作
    if (DOM.addChapterButton) {
      DOM.addChapterButton.addEventListener('click', handleAddChapter);
    }

    if (DOM.saveNewChapter) {
      DOM.saveNewChapter.addEventListener('click', handleSaveNewChapter);
    }

    if (DOM.updateChapter) {
      DOM.updateChapter.addEventListener('click', handleUpdateChapter);
    }

    // メイン機能
    if (DOM.shiftButton) {
      DOM.shiftButton.addEventListener('click', handleTimeShift);
    }

    if (DOM.formatButton) {
      DOM.formatButton.addEventListener('click', handleFormat);
    }

    if (DOM.downloadButton) {
      DOM.downloadButton.addEventListener('click', handleDownload);
    }

    if (DOM.copyButton) {
      DOM.copyButton.addEventListener('click', handleCopy);
    }

    // ショートカット
    if (DOM.keyboardShortcuts) {
      DOM.keyboardShortcuts.addEventListener('click', handleShowShortcutsModal);
    }

    // キーボードショートカット
    document.addEventListener('keydown', handleKeyboardShortcuts);

    // モーダルのセットアップ
    setupModalListeners();

    // リップルエフェクト追加
    addRippleEffect(document.querySelectorAll('button:not(.icon-button)'));

    // 初期状態で空のチャプターリスト表示
    updateChapterList(state, { onEdit: handleEditChapter, onDelete: handleDeleteChapter });

    console.log("YouTubeチャプターツール初期化完了");
  } catch (error) {
    console.error("初期化エラー:", error);
    showMessage("アプリケーションの初期化に失敗しました", "error");
  }
};

// アプリケーション起動
document.addEventListener('DOMContentLoaded', init);
