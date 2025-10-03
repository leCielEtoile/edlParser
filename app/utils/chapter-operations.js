// チャプター操作ユーティリティ - チャプター変換・整形・操作

/**
 * チャプターオブジェクトを文字列に変換
 * @param {Array<{time: string, name: string}>} chapters - チャプター配列
 * @returns {string} - フォーマットされた文字列
 */
export const chaptersToString = (chapters) => {
  return chapters.map(chapter => `${chapter.time} ${chapter.name}`).join('\n');
};

/**
 * 文字列からチャプターオブジェクトに変換
 * @param {string} str - チャプター文字列
 * @returns {Array<{time: string, name: string}>} - チャプター配列
 */
export const stringToChapters = (str) => {
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

/**
 * チャプターの時間をシフト
 * @param {Array<{time: string, name: string}>} chapters - チャプター配列
 * @param {boolean} shiftBack - true=1時間戻す, false=1時間進める
 * @returns {Array<{time: string, name: string}>} - シフトされたチャプター配列
 */
export const shiftChapterTimes = (chapters, shiftBack = true) => {
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

/**
 * チャプターの順序を時間で整列（早い順）
 * @param {Array<{time: string, name: string}>} chapters - チャプター配列
 * @returns {Array<{time: string, name: string}>} - ソートされたチャプター配列
 */
export const sortChaptersByTime = (chapters) => {
  return [...chapters].sort((a, b) => {
    const timeA = a.time.split(':').reduce((acc, val, idx) => acc + Number(val) * Math.pow(60, 2 - idx), 0);
    const timeB = b.time.split(':').reduce((acc, val, idx) => acc + Number(val) * Math.pow(60, 2 - idx), 0);
    return timeA - timeB;
  });
};

/**
 * フォーマット整形（重複削除、順番整理）
 * @param {Array<{time: string, name: string}>} chapters - チャプター配列
 * @returns {Array<{time: string, name: string}>} - 整形されたチャプター配列
 */
export const formatChapters = (chapters) => {
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

/**
 * 時間文字列を秒に変換
 * @param {string} timeStr - 時間文字列 (HH:MM:SS)
 * @returns {number} - 秒数
 */
export const timeToSeconds = (timeStr) => {
  const parts = timeStr.split(':').map(Number);
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
};

/**
 * 秒を時間文字列に変換
 * @param {number} seconds - 秒数
 * @returns {string} - 時間文字列 (HH:MM:SS)
 */
export const secondsToTime = (seconds) => {
  const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
};

/**
 * 時間形式の検証
 * @param {string} timeStr - 時間文字列
 * @returns {boolean} - 有効な形式かどうか
 */
export const isValidTimeFormat = (timeStr) => {
  return /^\d{2}:\d{2}:\d{2}$/.test(timeStr);
};
