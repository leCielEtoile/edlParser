// YouTubeチャプター変換ツール - スクリプト

// モジュールパターンでコードをカプセル化
const YoutubeChapterTool = (() => {
  // DOM要素キャッシュ
  const DOM = {
    toggleDarkMode: document.getElementById('toggleDarkMode'),
    fileInput: document.getElementById('fileInput'),
    pasteInput: document.getElementById('pasteInput'),
    convertButton: document.getElementById('convertButton'),
    editor: document.getElementById('editor'),
    shiftButton: document.getElementById('shiftButton'),
    formatButton: document.getElementById('formatButton'),
    downloadButton: document.getElementById('downloadButton'),
    copyButton: document.getElementById('copyButton'),
    message: document.getElementById('message')
  };

  // 状態管理
  const state = {
    isShifted: false,
    lastMode: null
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

// メッセージ表示
  const showMessage = (message, type = 'success') => {
    DOM.message.textContent = message;
    DOM.message.className = type;
    DOM.message.style.display = 'block';
    
    // 5秒後に消える
  setTimeout(() => {
      DOM.message.style.display = 'none';
  }, 5000);
  };

  // ファイル読み込み処理
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
  const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
    const content = e.target.result;
        const chapters = parseContent(content, file.name);
        DOM.editor.value = chaptersToString(chapters);
        
        showMessage(`ファイルを変換しました！（形式: ${getFormatDisplayName(state.lastMode)}）`);
      } catch (error) {
        showMessage(`エラー：${error.message}`, "error");
        DOM.editor.value = "";
      }
    };
    
    reader.onerror = () => {
      showMessage("ファイルの読み込みに失敗しました", "error");
    };
    
    reader.readAsText(file);
  };

  // コピペテキスト変換処理
  const handleConvertPasted = () => {
    const content = DOM.pasteInput.value;
    
    try {
      const chapters = parseContent(content);
      DOM.editor.value = chaptersToString(chapters);
      
      showMessage(`コピペ入力を変換しました！（形式: ${getFormatDisplayName(state.lastMode)}）`);
    } catch (error) {
      showMessage(`エラー：${error.message}`, "error");
      DOM.editor.value = "";
    }
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
    try {
      const chapters = stringToChapters(DOM.editor.value);
      
      if (chapters.length === 0) {
        showMessage("補正するチャプターがありません", "error");
    return;
  }
      
      const shiftedChapters = shiftChapterTimes(chapters, !state.isShifted);
      DOM.editor.value = chaptersToString(shiftedChapters);
      
      state.isShifted = !state.isShifted;
      DOM.shiftButton.textContent = state.isShifted ? "補正を元に戻す" : "00:00:00開始に補正";
      
      showMessage(state.isShifted ? "チャプター時間を1時間戻しました" : "チャプター時間を元に戻しました");
    } catch (error) {
      showMessage(`エラー：${error.message}`, "error");
    }
  };

  // フォーマット整形処理
  const handleFormat = () => {
    try {
      const chapters = stringToChapters(DOM.editor.value);
      
  if (chapters.length === 0) {
        showMessage("整形するチャプターがありません", "error");
        return;
      }
      
      const formattedChapters = formatChapters(chapters);
      DOM.editor.value = chaptersToString(formattedChapters);
      
      showMessage("チャプターを整形しました");
    } catch (error) {
      showMessage(`エラー：${error.message}`, "error");
    }
  };

  // ダウンロード処理
  const handleDownload = () => {
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
    
    if (document.body.classList.contains('dark')) {
      DOM.toggleDarkMode.textContent = '☀️ ライトモード切替';
      localStorage.setItem('darkMode', 'enabled');
    } else {
      DOM.toggleDarkMode.textContent = '🌙 ダークモード切替';
      localStorage.setItem('darkMode', 'disabled');
    }
  };

  // アプリケーション初期化
  const init = () => {
    // イベントリスナー設定
    DOM.toggleDarkMode.addEventListener('click', handleDarkModeToggle);
    DOM.fileInput.addEventListener('change', handleFileUpload);
    DOM.convertButton.addEventListener('click', handleConvertPasted);
    DOM.shiftButton.addEventListener('click', handleTimeShift);
    DOM.formatButton.addEventListener('click', handleFormat);
    DOM.downloadButton.addEventListener('click', handleDownload);
    DOM.copyButton.addEventListener('click', handleCopy);
    
    // ダークモード設定の復元
    if (localStorage.getItem('darkMode') === 'enabled' || 
        (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.body.classList.add('dark');
      DOM.toggleDarkMode.textContent = '☀️ ライトモード切替';
    }
    
    // メディアクエリの変更を監視
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      if (e.matches && !localStorage.getItem('darkMode')) {
        document.body.classList.add('dark');
        DOM.toggleDarkMode.textContent = '☀️ ライトモード切替';
      } else if (!e.matches && !localStorage.getItem('darkMode')) {
        document.body.classList.remove('dark');
        DOM.toggleDarkMode.textContent = '🌙 ダークモード切替';
      }
    });
  };

  // 公開API
  return {
    init
  };
})();

// アプリケーション起動
document.addEventListener('DOMContentLoaded', YoutubeChapterTool.init);