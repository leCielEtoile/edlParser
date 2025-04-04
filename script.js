// EDLパース共通ロジック
function parseEDLText(content) {
  const lines = content.split(/\r?\n/);
  const chapters = [];
  let lastTime = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const timeMatch = line.match(/(\d{2}:\d{2}:\d{2}):\d{2}/);
    if (timeMatch) {
      lastTime = timeMatch[1];
    }

    if (lastTime && lines[i + 1]) {
      const nextLine = lines[i + 1];
      const chapterMatch = nextLine.match(/\|M:(.+?)\|D:/);

      if (chapterMatch) {
        const chapterName = chapterMatch[1].trim();
        chapters.push(`${lastTime} ${chapterName}`);
        lastTime = null;
        i++;
      }
    }
  }

  return chapters;
}

// メッセージ表示
function showMessage(message, type = 'success') {
  const messageDiv = document.getElementById('message');
  messageDiv.textContent = message;
  messageDiv.className = type;
  messageDiv.style.display = 'block';

  setTimeout(() => {
    messageDiv.style.display = 'none';
  }, 5000);
}

// ファイルアップロード
document.getElementById('fileInput').addEventListener('change', function(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const content = e.target.result;
    const chapters = parseEDLText(content);

    if (chapters.length === 0) {
      showMessage("エラー：有効なチャプター情報が見つかりませんでした。", "error");
      document.getElementById('editor').value = "";
    } else {
      document.getElementById('editor').value = chapters.join('\n');
      showMessage("ファイルを変換しました！");
    }
  };
  reader.readAsText(file);
});

// コピペ入力変換
document.getElementById('convertButton').addEventListener('click', function() {
  const content = document.getElementById('pasteInput').value;
  if (!content.trim()) {
    showMessage("コピペ入力が空です。", "error");
    return;
  }

  const chapters = parseEDLText(content);

  if (chapters.length === 0) {
    showMessage("エラー：有効なチャプター情報が見つかりませんでした。", "error");
    document.getElementById('editor').value = "";
  } else {
    document.getElementById('editor').value = chapters.join('\n');
    showMessage("コピペ入力を変換しました！");
  }
});

// 補正ボタン
let shifted = false;
document.getElementById('shiftButton').addEventListener('click', function() {
  const lines = document.getElementById('editor').value.split('\n');
  const newLines = lines.map(line => {
    if (!line.trim()) return line;
    const parts = line.split(' ');
    if (parts.length < 2) return line;

    let [h, m, s] = parts[0].split(':').map(Number);
    let total = h * 3600 + m * 60 + s;

    if (!shifted) {
      total = Math.max(total - 3600, 0);
    } else {
      total += 3600;
    }

    const newH = String(Math.floor(total / 3600)).padStart(2, '0');
    const newM = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
    const newS = String(total % 60).padStart(2, '0');

    return `${newH}:${newM}:${newS} ${parts.slice(1).join(' ')}`;
  });

  document.getElementById('editor').value = newLines.join('\n');
  shifted = !shifted;
  document.getElementById('shiftButton').textContent = shifted ? "補正を元に戻す" : "00:00:00開始に補正";
});

// ダウンロード
document.getElementById('downloadButton').addEventListener('click', function() {
  const text = document.getElementById('editor').value;
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = "chapters.txt";
  a.click();

  URL.revokeObjectURL(url);
  showMessage("ファイルをダウンロードしました！");
});

// クリップボードにコピー
document.getElementById('copyButton').addEventListener('click', function() {
  const text = document.getElementById('editor').value;
  if (!text.trim()) {
    showMessage("コピーする内容が空です。", "error");
    return;
  }

  navigator.clipboard.writeText(text).then(() => {
    showMessage("チャプターをクリップボードにコピーしました！");
  }).catch(err => {
    showMessage("コピーに失敗しました：" + err, "error");
  });
});

// ダークモード切替
const toggleButton = document.getElementById('toggleDarkMode');
toggleButton.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  if (document.body.classList.contains('dark')) {
    toggleButton.textContent = '☀️ ライトモード切替';
  } else {
    toggleButton.textContent = '🌙 ダークモード切替';
  }
});

// 最初にOS設定をチェック
if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
  document.body.classList.add('dark');
  toggleButton.textContent = '☀️ ライトモード切替';
}
