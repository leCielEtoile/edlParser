// YouTubeチャプター変換ツール - スクリプト

// モジュールパターンでコードをカプセル化
const YoutubeChapterTool = (() => {
  // DOM要素キャッシュ
  const DOM = {
    // 基本UI要素
    toggleDarkMode: document.getElementById('toggleDarkMode'),
    keyboardShortcuts: document.getElementById('keyboardShortcuts'),
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
    message: document.getElementById('message'),
    
    // モーダル
    shortcutsModal: document.getElementById('shortcutsModal'),
    addChapterModal: document.getElementById('addChapterModal'),
    editChapterModal: document.getElementById('editChapterModal'),
    
    // モーダル内フォーム要素
    chapterTime: document.getElementById('chapterTime'),
    chapterTitle: document.getElementById('chapterTitle'),
    editChapterTime: document.getElementById('editChapterTime'),
    editChapterTitle: document.getElementById('editChapterTitle'),
    editChapterIndex: document.getElementById('editChapterIndex'),
    saveNewChapter: document.getElementById('saveNewChapter'),
    updateChapter: document.getElementById('updateChapter')
  };

  // 状態管理
  const state = {
    isShifted: false,
    lastMode: null,
    editingIndex: -1,
    chapters: []
  };

  // ユーティリティ関数
  
  // リップルエフェクト
  const createRipple = (event) => {
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
  
  // モーダル表示/非表示
  const showModal = (modal) => {
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
  
  const hideModal = (modal) => {
    if (!modal) return;
    modal.classList.remove('active');
    document.removeEventListener('keydown', handleModalEscapeKey);
    
    // スクロール再開
    document.body.style.overflow = '';
  };
  
  const handleModalEscapeKey = (event) => {
    if (event.key === 'Escape') {
      const activeModal = document.querySelector('.modal.active');
      if (activeModal) {
        hideModal(activeModal);
      }
    }
  };

  // ファイル形式の自動検出
  const detectFileFormat = (content, filename = '') => {
    if (!content || typeof content !== 'string') {
      return null;
    }
    
    // ファイル拡張子でチェック
    if (filename) {
      const ext = filename.split('.').pop().toLowerCase();
      if (ext === 'csv') {
        return 'premierecsv';
      } else if (ext === 'txt') {
        return 'premieretxt';
      }
    }
    
    // コンテンツに基づく形式検出
    if (content.includes("|M:")) {
      return "davinci";
    } else if (content.includes("* FROM CLIP NAME:")) {
      return "premiereedl";
    } else if ((content.includes("アセット名") && content.includes("インポイント") && content.includes("説明")) || 
               (content.includes("シーケンス") && /\d{2}:\d{2}:\d{2}:\d{2}/.test(content) && /\t/.test(content))) {
      return "premieretxt";
    } else if (/^\s*\uFEFF?マーカー/.test(content) || /^\s*\uFEFF?Marker/.test(content) || 
               /^\s*\uFEFF?(Name|名前)/.test(content)) {
      return "premierecsv";
    } else if (/\d{2}:\d{2}:\d{2}(:\d{2})?/.test(content) && /[,\t]/.test(content)) {
      // カンマかタブ区切りでタイムコードを含むファイル
      return content.includes(',') ? "premierecsv" : "premieretxt";
    } else {
      // 形式が判断できない場合
      return null;
    }
  };

  // DaVinci用EDL解析
  const parseDaVinciEDL = (content) => {
    if (!content) return [];
    
    const lines = content.split(/\r?\n/);
    const chapters = [];
    let lastTime = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const timeMatch = line.match(/(\d{2}:\d{2}:\d{2}):\d{2}/);
      
      if (timeMatch) {
        lastTime = timeMatch[1];
      }
      
      if (lastTime && i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        const chapterMatch = nextLine.match(/\|M:(.+?)\|D:/);
        
        if (chapterMatch) {
          const chapterName = chapterMatch[1].trim();
          chapters.push({
            time: lastTime,
            name: chapterName
          });
          
          lastTime = null;
          i++; // 次の行をスキップ
        }
      }
    }
    
    return chapters;
  };

  // Premiere用EDL解析
  const parsePremiereEDL = (content) => {
    if (!content) return [];
    
    const lines = content.split(/\r?\n/);
    const chapters = [];
    let lastTime = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const timeMatch = line.match(/(\d{2}:\d{2}:\d{2}):\d{2}/);
      
      if (timeMatch) {
        lastTime = timeMatch[1];
      }
      
      if (lastTime && i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        const chapterMatch = nextLine.match(/\* FROM CLIP NAME:\s*(.+)/);
        
        if (chapterMatch) {
          const chapterName = chapterMatch[1].trim();
          chapters.push({
            time: lastTime,
            name: chapterName
          });
          
          lastTime = null;
          i++; // 次の行をスキップ
        }
      }
    }
    
    return chapters;
  };

  // Premiereマーカーテキスト形式（タブ区切り）解析
  const parsePremiereTxtMarkers = (content) => {
    if (!content) return [];
    
    const lines = content.split(/\r?\n/);
    const chapters = [];
    
    // ヘッダー行があるかの確認
    let startIndex = 0;
    if (lines[0] && (lines[0].includes('アセット名') || lines[0].includes('インポイント') || 
                     lines[0].includes('説明') || !lines[0].match(/\d{2}:\d{2}:\d{2}/))) {
      startIndex = 1; // ヘッダー行をスキップ
    }
    
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // タブで分割（連続したタブは1つとして扱う）
      const parts = line.split(/\t+/);
      
      if (parts.length >= 3) {
        // 形式：[アセット名, タイムコード, 説明]
        const timeStr = parts[1].trim();
        const title = parts[2].trim();
        
        // タイムコード形式を確認 (HH:MM:SS:FF)
        const timeMatch = timeStr.match(/(\d{2}:\d{2}:\d{2}):\d{2}/);
        if (timeMatch) {
          chapters.push({
            time: timeMatch[1], // HH:MM:SS 部分のみ取得
            name: title
          });
        }
      } else if (parts.length === 2) {
        // 簡易形式：[タイムコード, 説明] の可能性
        const timeStr = parts[0].trim();
        const title = parts[1].trim();
        
        const timeMatch = timeStr.match(/(\d{2}:\d{2}:\d{2})(:\d{2})?/);
        if (timeMatch) {
          chapters.push({
            time: timeMatch[1], // HH:MM:SS 部分を取得
            name: title
          });
        }
      }
    }
    
    return chapters;
  };

  // PremiereマーカーCSV形式解析
  const parsePremiereCSVMarkers = (content) => {
    if (!content) return [];
    
    // BOMを削除
    content = content.replace(/^\uFEFF/, '');
    
    // 一般的な文字化けを修正（エンコーディングの問題に対応）
    content = content.replace(/[\u00DE\u00FC\u00AB]/g, '');
    
    const lines = content.split(/\r?\n/);
    const chapters = [];
    
    // ヘッダー行かどうかを判断
    let startIndex = 0;
    if (lines[0] && (!lines[0].match(/\d{2}:\d{2}:\d{2}/) || 
        lines[0].match(/(マーカー|Marker|Name|名前|タイムコード|Timecode)/i))) {
      startIndex = 1; // ヘッダー行をスキップ
    }
    
    // 時間コードの列インデックスを特定
    let timeIndex = -1;
    let nameIndex = -1;
    
    if (startIndex === 1 && lines[0]) {
      const headers = parseCSVLine(lines[0]);
      for (let i = 0; i < headers.length; i++) {
        const header = headers[i].toLowerCase();
        if (header.includes('time') || header.includes('タイム') || 
            header.includes('時間') || header.includes('インポイント')) {
          timeIndex = i;
        } else if (header.includes('name') || header.includes('名前') || 
                  header.includes('タイトル') || header.includes('説明') || 
                  header.includes('コメント')) {
          nameIndex = i;
        }
      }
    }
    
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // CSVラインを解析
      const fields = parseCSVLine(line);
      
      // ヘッダーから列インデックスが特定されている場合
      if (timeIndex !== -1 && nameIndex !== -1 && fields.length > Math.max(timeIndex, nameIndex)) {
        const timeStr = fields[timeIndex].trim();
        const title = fields[nameIndex].trim();
        
        const timeMatch = timeStr.match(/(\d{2}:\d{2}:\d{2})(:\d{2})?/);
        if (timeMatch) {
          chapters.push({
            time: timeMatch[1],
            name: title || `マーカー ${chapters.length + 1}`
          });
        }
      } else {
        // ヘッダーが特定できない場合は全フィールドを検索
        let foundTime = false;
        
        for (let j = 0; j < fields.length; j++) {
          const field = fields[j].trim();
          const timeMatch = field.match(/(\d{2}:\d{2}:\d{2})(:\d{2})?/);
          
          if (timeMatch) {
            // 時間の次か前のフィールドをタイトルとして試す
            let title = '';
            
            if (j + 1 < fields.length) {
              title = fields[j + 1].trim();
            } else if (j > 0) {
              title = fields[j - 1].trim();
            }
            
            // タイトルが空またはタイムコードを含む場合はマーカー番号を使用
            if (!title || title.match(/\d{2}:\d{2}:\d{2}/)) {
              title = `マーカー ${chapters.length + 1}`;
            }
            
            chapters.push({
              time: timeMatch[1],
              name: title
            });
            
            foundTime = true;
            break;
          }
        }
        
        // 時間が見つからなかった場合はスキップ
        if (!foundTime) continue;
      }
    }
    
    return chapters;
  };
  
  // CSVライン解析（引用符に対応）
  const parseCSVLine = (line) => {
    const result = [];
    let inQuotes = false;
    let currentValue = '';
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          // 引用符のエスケープ（""）
          currentValue += '"';
          i++;
        } else {
          // 引用符の開始または終了
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // フィールドの区切り
        result.push(currentValue);
        currentValue = '';
      } else {
        // 通常の文字
        currentValue += char;
      }
    }
    
    // 最後のフィールドを追加
    result.push(currentValue);
    
    return result;
  };

  // チャプターオブジェクトを文字列に変換
  const chaptersToString = (chapters) => {
    return chapters.map(chapter => `${chapter.time} ${chapter.name}`).join('\n');
  };

  // 文字列からチャプターオブジェクトに変換
  const stringToChapters = (str) => {
    if (!str) return [];
    
    return str.split('\n')
      .filter(line => line.trim())
      .map(line => {
        const match = line.match(/^(\d{2}:\d{2}:\d{2})\s+(.+)$/);
        if (match) {
          return {
            time: match[1],
            name: match[2]
          };
        }
        return null;
      })
      .filter(chapter => chapter !== null);
  };

  // チャプターの時間をシフト
  const shiftChapterTimes = (chapters, shiftBack = true) => {
    return chapters.map(chapter => {
      let [h, m, s] = chapter.time.split(':').map(Number);
      let total = h * 3600 + m * 60 + s;
      
      if (shiftBack) {
        // 1時間戻す（負の値にならないように）
        total = Math.max(total - 3600, 0);
      } else {
        // 1時間進める
        total += 3600;
      }
      
      const newH = String(Math.floor(total / 3600)).padStart(2, '0');
      const newM = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
      const newS = String(total % 60).padStart(2, '0');
      
      return {
        time: `${newH}:${newM}:${newS}`,
        name: chapter.name
      };
    });
  };

  // チャプターの順序を時間で整列（早い順）
  const sortChaptersByTime = (chapters) => {
    return [...chapters].sort((a, b) => {
      const timeA = a.time.split(':').reduce((acc, val, idx) => acc + Number(val) * Math.pow(60, 2 - idx), 0);
      const timeB = b.time.split(':').reduce((acc, val, idx) => acc + Number(val) * Math.pow(60, 2 - idx), 0);
      return timeA - timeB;
    });
  };

  // フォーマット整形（重複削除、順番整理）
  const formatChapters = (chapters) => {
    // 重複を削除（同じ時間の場合、最初の項目を保持）
    const uniqueChapters = [];
    const timesSeen = new Set();
    
    for (const chapter of chapters) {
      if (!timesSeen.has(chapter.time)) {
        timesSeen.add(chapter.time);
        uniqueChapters.push(chapter);
      }
    }
    
    // 時間順にソート
    return sortChaptersByTime(uniqueChapters);
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
    let chapters = [];
    
    switch (format) {
      case "davinci":
        chapters = parseDaVinciEDL(content);
        break;
      case "premiereedl":
        chapters = parsePremiereEDL(content);
        break;
      case "premieretxt":
        chapters = parsePremiereTxtMarkers(content);
        break;
      case "premierecsv":
        chapters = parsePremiereCSVMarkers(content);
        break;
      default:
        throw new Error("未対応のファイル形式です");
    }
    
    if (chapters.length === 0) {
      throw new Error("チャプター情報が見つかりませんでした");
    }
    
    // 時間順に並べ替え
    return sortChaptersByTime(chapters);
  };

  // チャプターリスト表示を更新
  const updateChapterList = () => {
    // エディタの内容からチャプターリストを更新
    try {
      const chapters = stringToChapters(DOM.editor.value);
      state.chapters = chapters;
      
      // チャプターリストをクリア
      if (!DOM.chapterList) return;
      
      DOM.chapterList.innerHTML = '';
      
      if (chapters.length === 0) {
        DOM.chapterList.innerHTML = 
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
        if (editButton) {
          editButton.addEventListener('click', (e) => {
            e.stopPropagation();
            handleEditChapter(index);
            createRipple(e);
          });
        }
        
        // 削除ボタンのイベントリスナー
        const deleteButton = chapterItem.querySelector('.delete-button');
        if (deleteButton) {
          deleteButton.addEventListener('click', (e) => {
            e.stopPropagation();
            handleDeleteChapter(index);
            createRipple(e);
          });
        }
        
        // チャプター項目全体のクリックでも編集モーダルを開く
        chapterItem.addEventListener('click', () => {
          handleEditChapter(index);
        });
        
        DOM.chapterList.appendChild(chapterItem);
      });
    } catch (error) {
      console.error("チャプターリスト更新エラー:", error);
    }
  };
  
  // HTMLエスケープ（XSS対策）
  const escapeHtml = (unsafe) => {
    if (!unsafe) return '';
    return String(unsafe)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  // メッセージ表示
  const showMessage = (message, type = 'success') => {
    if (!DOM.message) return;
    
    DOM.message.textContent = message;
    DOM.message.className = type;
    DOM.message.style.display = 'block';
    
    // アクセシビリティ対応
    DOM.message.setAttribute('role', 'alert');
    
    // 5秒後に消える
    setTimeout(() => {
      DOM.message.style.display = 'none';
      DOM.message.removeAttribute('role');
    }, 5000);
  };

  // イベントハンドラ
  
  // ドラッグ＆ドロップ処理
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
      handleFileUpload(); // 自動的にファイル処理を開始
    }
  };
  
  // ドロップエリアクリック処理
  const handleDropAreaClick = () => {
    if (DOM.fileInput) {
      DOM.fileInput.click();
    }
  };
  
  // ファイル読み込み処理
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
        updateChapterList();
        
        showMessage(`ファイルを変換しました！（形式: ${getFormatDisplayName(state.lastMode)}）`);
      } catch (error) {
        showMessage(`エラー：${error.message}`, "error");
        if (DOM.editor) DOM.editor.value = "";
        updateChapterList();
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

  // コピペテキスト変換処理
  const handleConvertPasted = () => {
    if (!DOM.pasteInput || !DOM.editor) return;
    
    const content = DOM.pasteInput.value;
    
    try {
      const chapters = parseContent(content);
      DOM.editor.value = chaptersToString(chapters);
      updateChapterList();
      
      showMessage(`コピペ入力を変換しました！（形式: ${getFormatDisplayName(state.lastMode)}）`);
    } catch (error) {
      showMessage(`エラー：${error.message}`, "error");
      DOM.editor.value = "";
      updateChapterList();
    }
  };
  
  // 入力クリア処理
  const handleClearPasteInput = () => {
    if (!DOM.pasteInput) return;
    DOM.pasteInput.value = '';
    DOM.pasteInput.focus();
  };
  
  const handleClearEditor = () => {
    if (!DOM.editor) return;
    DOM.editor.value = '';
    updateChapterList();
    DOM.editor.focus();
  };
  
  // チャプター編集処理
  const handleAddChapter = () => {
    // 新規チャプターモーダルを表示
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
    
    // 時間の形式チェック
    if (!time.match(/^\d{2}:\d{2}:\d{2}$/)) {
      showMessage("時間は00:00:00の形式で入力してください", "error");
      return;
    }
    
    // 現在のチャプターを取得
    const currentChapters = stringToChapters(DOM.editor.value);
    
    // 新しいチャプターを追加
    const newChapter = { time, name: title };
    const chapters = [...currentChapters, newChapter];
    
    // 時間順に並べ替え
    const sortedChapters = sortChaptersByTime(chapters);
    
    // UIとステートを更新
    DOM.editor.value = chaptersToString(sortedChapters);
    updateChapterList();
    
    // モーダルを閉じる
    hideModal(DOM.addChapterModal);
    
    showMessage("チャプターを追加しました");
  };
  
  const handleEditChapter = (index) => {
    if (!DOM.editor || !DOM.editChapterTime || !DOM.editChapterTitle || !DOM.editChapterIndex || !DOM.editChapterModal) return;
    
    const chapters = stringToChapters(DOM.editor.value);
    
    if (index < 0 || index >= chapters.length) return;
    
    const chapter = chapters[index];
    
    // 編集モーダルに値をセット
    DOM.editChapterTime.value = chapter.time;
    DOM.editChapterTitle.value = chapter.name;
    DOM.editChapterIndex.value = index;
    
    // モーダルを表示
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
    
    // 時間の形式チェック
    if (!time.match(/^\d{2}:\d{2}:\d{2}$/)) {
      showMessage("時間は00:00:00の形式で入力してください", "error");
      return;
    }
    
    // チャプターを更新
    const updatedChapters = [...chapters];
    updatedChapters[index] = { time, name: title };
    
    // 時間順に並べ替え
    const sortedChapters = sortChaptersByTime(updatedChapters);
    
    // UIとステートを更新
    DOM.editor.value = chaptersToString(sortedChapters);
    updateChapterList();
    
    // モーダルを閉じる
    hideModal(DOM.editChapterModal);
    
    showMessage("チャプターを更新しました");
  };
  
  const handleDeleteChapter = (index) => {
    if (!DOM.editor) return;
    
    const chapters = stringToChapters(DOM.editor.value);
    
    if (index < 0 || index >= chapters.length) return;
    
    if (!confirm(`チャプター「${chapters[index].time} ${chapters[index].name}」を削除しますか？`)) {
      return;
    }
    
    // チャプターを削除
    const updatedChapters = [...chapters];
    updatedChapters.splice(index, 1);
    
    // UIとステートを更新
    DOM.editor.value = chaptersToString(updatedChapters);
    updateChapterList();
    
    showMessage("チャプターを削除しました");
  };
  
  // ファイル形式の表示名を取得
  const getFormatDisplayName = (format) => {
    switch (format) {
      case "davinci":
        return "DaVinci Resolve EDL";
      case "premiereedl":
        return "Premiere Pro EDL";
      case "premieretxt":
        return "Premiere Pro マーカーテキスト";
      case "premierecsv":
        return "Premiere Pro マーカーCSV";
      default:
        return "不明";
    }
  };

  // 時間補正処理
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
      updateChapterList();
      
      state.isShifted = !state.isShifted;
      DOM.shiftButton.innerHTML = state.isShifted ? 
        '<i class="fas fa-clock"></i> 補正を元に戻す' : 
        '<i class="fas fa-clock"></i> 00:00:00開始に補正';
      
      showMessage(state.isShifted ? "チャプター時間を1時間戻しました" : "チャプター時間を元に戻しました");
    } catch (error) {
      showMessage(`エラー：${error.message}`, "error");
    }
  };

  // フォーマット整形処理
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
      updateChapterList();
      
      showMessage("チャプターを整形しました");
    } catch (error) {
      showMessage(`エラー：${error.message}`, "error");
    }
  };

  // ダウンロード処理
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

  // クリップボードにコピー処理
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

  // ダークモード切替処理
  const handleDarkModeToggle = () => {
    document.body.classList.toggle('dark');
    
    if (!DOM.toggleDarkMode) return;
    
    if (document.body.classList.contains('dark')) {
      DOM.toggleDarkMode.innerHTML = '<i class="fas fa-sun"></i>';
      DOM.toggleDarkMode.title = "ライトモード切替";
      localStorage.setItem('darkMode', 'enabled');
    } else {
      DOM.toggleDarkMode.innerHTML = '<i class="fas fa-moon"></i>';
      DOM.toggleDarkMode.title = "ダークモード切替";
      localStorage.setItem('darkMode', 'disabled');
    }
  };
  
  // キーボードショートカット処理
  const handleKeyboardShortcuts = (event) => {
    // フォーム要素がフォーカスされている場合はショートカットを無効化
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
      return;
    }
    
    // モーダルが開いている場合はショートカットを無効化
    if (document.querySelector('.modal.active')) {
      return;
    }
    
    // Ctrl + S: ダウンロード
    if (event.ctrlKey && event.key === 's') {
      event.preventDefault();
      handleDownload();
      return;
    }
    
    // Ctrl + C: コピー（編集エリアにフォーカスがない場合のみ）
    if (event.ctrlKey && event.key === 'c' && document.activeElement !== DOM.editor) {
      event.preventDefault();
      handleCopy();
      return;
    }
    
    // Ctrl + F: フォーマット整形
    if (event.ctrlKey && event.key === 'f') {
      event.preventDefault();
      handleFormat();
      return;
    }
    
    // Ctrl + T: 時間補正
    if (event.ctrlKey && event.key === 't') {
      event.preventDefault();
      handleTimeShift();
      return;
    }
    
    // Alt + A: チャプター追加
    if (event.altKey && event.key === 'a') {
      event.preventDefault();
      handleAddChapter();
      return;
    }
    
    // Alt + D: ダークモード切替
    if (event.altKey && event.key === 'd') {
      event.preventDefault();
      handleDarkModeToggle();
      return;
    }
  };
  
  // エディタの内容変更時の処理
  const handleEditorChange = () => {
    // エディタの内容が変更されたらチャプターリストを更新
    updateChapterList();
  };
  
  // モーダル関連のイベントハンドラー
  const handleShowShortcutsModal = () => {
    if (DOM.shortcutsModal) {
      showModal(DOM.shortcutsModal);
    }
  };
  
  // リップルエフェクト処理
  const addRippleEffect = (elements) => {
    if (!elements) return;
    
    if (elements instanceof HTMLElement) {
      elements.addEventListener('click', createRipple);
    } else if (elements instanceof NodeList || Array.isArray(elements)) {
      elements.forEach(element => {
        element.addEventListener('click', createRipple);
      });
    }
  };

  // アプリケーション初期化
  const init = () => {
    try {
      console.log("YouTubeチャプターツール初期化開始");
      
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
      
      // ダークモードとショートカット
      if (DOM.toggleDarkMode) {
        DOM.toggleDarkMode.addEventListener('click', handleDarkModeToggle);
      }
      
      if (DOM.keyboardShortcuts) {
        DOM.keyboardShortcuts.addEventListener('click', handleShowShortcutsModal);
      }
      
      // キーボードショートカット
      document.addEventListener('keydown', handleKeyboardShortcuts);
      
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
      
      // リップルエフェクト追加
      addRippleEffect(document.querySelectorAll('button:not(.icon-button)'));
      
      // ダークモード設定の復元
      if (localStorage.getItem('darkMode') === 'enabled' || 
          (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.body.classList.add('dark');
        if (DOM.toggleDarkMode) {
          DOM.toggleDarkMode.innerHTML = '<i class="fas fa-sun"></i>';
          DOM.toggleDarkMode.title = "ライトモード切替";
        }
      }
      
      // メディアクエリの変更を監視
      const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      if (darkModeMediaQuery.addEventListener) {
        darkModeMediaQuery.addEventListener('change', e => {
          if (e.matches && !localStorage.getItem('darkMode')) {
            document.body.classList.add('dark');
            if (DOM.toggleDarkMode) {
              DOM.toggleDarkMode.innerHTML = '<i class="fas fa-sun"></i>';
              DOM.toggleDarkMode.title = "ライトモード切替";
            }
          } else if (!e.matches && !localStorage.getItem('darkMode')) {
            document.body.classList.remove('dark');
            if (DOM.toggleDarkMode) {
              DOM.toggleDarkMode.innerHTML = '<i class="fas fa-moon"></i>';
              DOM.toggleDarkMode.title = "ダークモード切替";
            }
          }
        });
      } else if (darkModeMediaQuery.addListener) {
        // Safari用のフォールバック
        darkModeMediaQuery.addListener(e => {
          if (e.matches && !localStorage.getItem('darkMode')) {
            document.body.classList.add('dark');
            if (DOM.toggleDarkMode) {
              DOM.toggleDarkMode.innerHTML = '<i class="fas fa-sun"></i>';
              DOM.toggleDarkMode.title = "ライトモード切替";
            }
          } else if (!e.matches && !localStorage.getItem('darkMode')) {
            document.body.classList.remove('dark');
            if (DOM.toggleDarkMode) {
              DOM.toggleDarkMode.innerHTML = '<i class="fas fa-moon"></i>';
              DOM.toggleDarkMode.title = "ダークモード切替";
            }
          }
        });
      }
      
      // 初期状態で空のチャプターリスト表示
      updateChapterList();
      
      console.log("YouTubeチャプターツール初期化完了");
    } catch (error) {
      console.error("初期化エラー:", error);
      showMessage("アプリケーションの初期化に失敗しました", "error");
    }
  };

  // 公開API
  return {
    init
  };
})();

// アプリケーション起動
document.addEventListener('DOMContentLoaded', YoutubeChapterTool.init);