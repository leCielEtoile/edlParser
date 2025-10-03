// Cloudflare Pages Function - 画像メタデータ削除API

/**
 * PNGメタデータ削除関数
 * 必須チャンク（IHDR, PLTE, IDAT, IEND）のみを保持
 */
function removePNGMetadata(buffer) {
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
function removeJPEGMetadata(buffer) {
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
 * Pages Function ハンドラー
 */
export async function onRequestPost(context) {
  try {
    const formData = await context.request.formData();
    const imageFile = formData.get('image');
    
    if (!imageFile) {
      return new Response(JSON.stringify({ error: '画像ファイルが見つかりません' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const buffer = await imageFile.arrayBuffer();
    const mimeType = imageFile.type;
    const filename = imageFile.name || 'image';
    
    let cleanedData;
    let outputMimeType = mimeType;
    
    // MIME typeに基づいて処理を分岐
    if (mimeType === 'image/png') {
      cleanedData = removePNGMetadata(buffer);
      outputMimeType = 'image/png';
    } else if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
      cleanedData = removeJPEGMetadata(buffer);
      outputMimeType = 'image/jpeg';
    } else {
      // バイナリ署名で判定
      const data = new Uint8Array(buffer);
      if (data[0] === 137 && data[1] === 80 && data[2] === 78 && data[3] === 71) {
        cleanedData = removePNGMetadata(buffer);
        outputMimeType = 'image/png';
      } else if (data[0] === 0xFF && data[1] === 0xD8) {
        cleanedData = removeJPEGMetadata(buffer);
        outputMimeType = 'image/jpeg';
      } else {
        return new Response(JSON.stringify({ 
          error: 'この形式は処理できません。PNG または JPEG を使用してください。' 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    // ファイル名を生成
    const cleanedFilename = `cleaned_${filename}`;
    
    return new Response(cleanedData.buffer, {
      headers: {
        'Content-Type': outputMimeType,
        'Content-Disposition': `attachment; filename="${cleanedFilename}"`,
        'Content-Length': cleanedData.length.toString()
      }
    });
    
  } catch (error) {
    console.error('エラー:', error);
    return new Response(JSON.stringify({ 
      error: error.message || '処理中にエラーが発生しました' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}