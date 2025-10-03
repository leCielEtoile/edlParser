// クライアントサイド画像メタデータ削除処理

/**
 * PNGメタデータ削除関数
 * 必須チャンク（IHDR, PLTE, IDAT, IEND）のみを保持
 */
export function removePNGMetadata(buffer) {
  const data = new Uint8Array(buffer);

  // PNG署名検証（137, 80, 78, 71, 13, 10, 26, 10）
  const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < 8; i++) {
    if (data[i] !== pngSignature[i]) {
      throw new Error('有効なPNGファイルではありません');
    }
  }

  const result = [];

  // PNG署名をコピー
  for (let i = 0; i < 8; i++) {
    result.push(data[i]);
  }

  let pos = 8;
  const essentialChunks = ['IHDR', 'PLTE', 'IDAT', 'IEND'];

  while (pos < data.length) {
    // チャンク長を読む（4バイト、ビッグエンディアン）
    if (pos + 8 > data.length) break;

    const length = (data[pos] << 24) | (data[pos + 1] << 16) |
                   (data[pos + 2] << 8) | data[pos + 3];

    // チャンクタイプを読む（4バイト）
    const type = String.fromCharCode(data[pos + 4], data[pos + 5],
                                     data[pos + 6], data[pos + 7]);

    // チャンク全体のサイズ = 長さ(4) + タイプ(4) + データ(length) + CRC(4)
    const chunkSize = 12 + length;

    if (pos + chunkSize > data.length) break;

    // 必須チャンクのみ保持
    if (essentialChunks.includes(type)) {
      for (let i = 0; i < chunkSize; i++) {
        result.push(data[pos + i]);
      }
    }

    // IENDチャンクで終了
    if (type === 'IEND') break;

    pos += chunkSize;
  }

  return new Uint8Array(result);
}

/**
 * JPEGメタデータ削除関数
 * メタデータセグメント（APP0-APP15, COM）を除外
 */
export function removeJPEGMetadata(buffer) {
  const data = new Uint8Array(buffer);

  // JPEG署名検証（0xFF, 0xD8 = SOI）
  if (data[0] !== 0xFF || data[1] !== 0xD8) {
    throw new Error('有効なJPEGファイルではありません');
  }

  const result = [];

  // SOI（Start of Image）をコピー
  result.push(0xFF, 0xD8);

  let pos = 2;

  while (pos < data.length) {
    // マーカーを探す（0xFFで始まる）
    if (data[pos] !== 0xFF) {
      pos++;
      continue;
    }

    const marker = data[pos + 1];

    // EOI（End of Image）に到達
    if (marker === 0xD9) {
      result.push(0xFF, 0xD9);
      break;
    }

    // マーカーのみ（長さフィールドなし）
    if (marker === 0x00 || (marker >= 0xD0 && marker <= 0xD7) || marker === 0x01) {
      result.push(0xFF, marker);
      pos += 2;
      continue;
    }

    // セグメント長を読む（2バイト、ビッグエンディアン、長さ自体を含む）
    if (pos + 3 >= data.length) break;

    const segmentLength = (data[pos + 2] << 8) | data[pos + 3];

    if (pos + 2 + segmentLength > data.length) break;

    // メタデータセグメント（APP0-APP15: 0xE0-0xEF, COM: 0xFE）を除外
    const isMetadata = (marker >= 0xE0 && marker <= 0xEF) || marker === 0xFE;

    if (!isMetadata) {
      // 画像データセグメント（SOF, SOS, DQT, DHT等）を保持
      for (let i = 0; i < segmentLength + 2; i++) {
        result.push(data[pos + i]);
      }
    }

    pos += 2 + segmentLength;
  }

  return new Uint8Array(result);
}

/**
 * 画像ファイルのメタデータを削除
 * @param {File} file - 画像ファイル
 * @returns {Promise<{blob: Blob, mimeType: string}>} - 処理済みのBlob
 */
export async function processImage(file) {
  const buffer = await file.arrayBuffer();
  const data = new Uint8Array(buffer);

  let cleanedData;
  let mimeType;

  // ファイル形式を判定
  if (data[0] === 137 && data[1] === 80 && data[2] === 78 && data[3] === 71) {
    // PNG
    cleanedData = removePNGMetadata(buffer);
    mimeType = 'image/png';
  } else if (data[0] === 0xFF && data[1] === 0xD8) {
    // JPEG
    cleanedData = removeJPEGMetadata(buffer);
    mimeType = 'image/jpeg';
  } else {
    throw new Error('PNG または JPEG 形式のファイルを使用してください');
  }

  const blob = new Blob([cleanedData], { type: mimeType });

  return { blob, mimeType };
}
