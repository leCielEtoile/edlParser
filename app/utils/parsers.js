// パーサーユーティリティ - 各種ファイル形式からチャプター情報を抽出

/**
 * ファイル形式の自動検出
 * @param {string} content - ファイルコンテンツ
 * @param {string} filename - ファイル名
 * @returns {string|null} - 検出された形式名
 */
export const detectFileFormat = (content, filename = '') => {
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

/**
 * DaVinci Resolve EDL形式のパース
 * @param {string} content - EDLコンテンツ
 * @returns {Array<{time: string, name: string}>} - チャプター配列
 */
export const parseDaVinciEDL = (content) => {
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

/**
 * Premiere Pro EDL形式のパース
 * @param {string} content - EDLコンテンツ
 * @returns {Array<{time: string, name: string}>} - チャプター配列
 */
export const parsePremiereEDL = (content) => {
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

/**
 * Premiere Proマーカーテキスト形式（タブ区切り）のパース
 * @param {string} content - テキストコンテンツ
 * @returns {Array<{time: string, name: string}>} - チャプター配列
 */
export const parsePremiereTxtMarkers = (content) => {
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

/**
 * Premiere Pro マーカーCSV形式のパース
 * @param {string} content - CSVコンテンツ
 * @returns {Array<{time: string, name: string}>} - チャプター配列
 */
export const parsePremiereCSVMarkers = (content) => {
  if (!content) return [];

  // BOMを削除
  content = content.replace(/^\uFEFF|\uFFFE/, '');

  // エンコーディング問題の対処（CP1252など）
  content = content.replace(/[\u00DE\u00FC\u00AB\u00FE\u00FF]/g, '');

  const lines = content.split(/\r?\n/);
  const chapters = [];

  if (lines.length <= 1) return chapters;

  // ヘッダー行を処理してカラムのインデックスを特定
  const headers = lines[0].split(/\t|,/);

  let markerNameIndex = -1;
  let descriptionIndex = -1;
  let inPointIndex = -1;

  // 各ヘッダーを検索してインデックスを特定
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i].trim().toLowerCase();

    if (header.includes('マーカー名') || header.includes('name') || header.includes('名前')) {
      markerNameIndex = i;
    } else if (header.includes('説明') || header.includes('コメント') || header.includes('description') || header.includes('comment')) {
      descriptionIndex = i;
    } else if (header.includes('イン') || header.includes('インポイント') || header.includes('in') || header.includes('start')) {
      inPointIndex = i;
    }
  }

  // ヘッダーが見つからない場合はデフォルトインデックスを試用
  if (inPointIndex === -1) {
    // 典型的なプレミアプロCSVではインポイントは3列目ことが多い
    inPointIndex = 2;
  }

  // データ行を処理
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const fields = line.split(/\t|,/);
    if (fields.length <= inPointIndex) continue;

    // タイムコードを抽出（イン列から）
    let timeCode = '';
    if (inPointIndex >= 0 && inPointIndex < fields.length) {
      const inPoint = fields[inPointIndex].trim();
      const timeMatch = inPoint.match(/(\d{2}):(\d{2}):(\d{2})(?::(\d{2}))?/);

      if (timeMatch) {
        // HH:MM:SS形式に変換（フレーム部分を除外）
        timeCode = timeMatch[1] + ':' + timeMatch[2] + ':' + timeMatch[3];
      }
    }

    if (!timeCode) continue;

    // タイトルを抽出（マーカー名列または説明列から）
    let title = '';

    if (markerNameIndex >= 0 && markerNameIndex < fields.length && fields[markerNameIndex].trim()) {
      title = fields[markerNameIndex].trim();
    } else if (descriptionIndex >= 0 && descriptionIndex < fields.length && fields[descriptionIndex].trim()) {
      title = fields[descriptionIndex].trim();
    }

    // タイトルが空の場合はデフォルト値を設定
    if (!title) {
      title = `マーカー ${chapters.length + 1}`;
    }

    chapters.push({
      time: timeCode,
      name: title
    });
  }

  return chapters;
};

/**
 * ファイル形式の表示名を取得
 * @param {string} format - 形式名
 * @returns {string} - 表示用の形式名
 */
export const getFormatDisplayName = (format) => {
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

/**
 * パーサーマップ - 形式名からパーサー関数へのマッピング
 */
export const PARSERS = {
  davinci: parseDaVinciEDL,
  premiereedl: parsePremiereEDL,
  premieretxt: parsePremiereTxtMarkers,
  premierecsv: parsePremiereCSVMarkers
};
