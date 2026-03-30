/**
 * Steganography Service
 * Handles embedding and extracting data from image pixels (LSB).
 */

export interface StegoResult {
  name: string;
  data: string;
  size: number;
}

/**
 * Embeds a file into a cover image using LSB steganography.
 */
export async function embedDataInImage(
  file: File,
  coverImage: File,
  password: string,
  canvas: HTMLCanvasElement
): Promise<string> {
  const fileData = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.readAsDataURL(file);
  });

  const img = new Image();
  img.src = URL.createObjectURL(coverImage);
  
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
  });

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error("Context not found");

  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0);

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  const payload = JSON.stringify({ name: file.name, data: fileData });
  const encoder = new TextEncoder();
  const payloadBytes = encoder.encode(payload);
  const keyBytes = encoder.encode(password);
  
  const encryptedBytes = new Uint8Array(payloadBytes.length);
  for (let i = 0; i < payloadBytes.length; i++) {
    encryptedBytes[i] = payloadBytes[i] ^ keyBytes[i % keyBytes.length];
  }

  // Prefix with "ENC:"
  const prefix = encoder.encode("ENC:");
  const finalPayload = new Uint8Array(prefix.length + encryptedBytes.length);
  finalPayload.set(prefix);
  finalPayload.set(encryptedBytes, prefix.length);
  
  // Convert to binary
  let binaryData = "";
  // Add length header (32 bits)
  const length = finalPayload.length;
  const lengthBinary = length.toString(2).padStart(32, '0');
  binaryData += lengthBinary;
  
  for (let i = 0; i < finalPayload.length; i++) {
    binaryData += finalPayload[i].toString(2).padStart(8, '0');
  }
  
  const maxBits = (data.length / 4) * 3;
  if (binaryData.length > maxBits) {
    throw new Error("File is too large for this cover image. Try a larger image.");
  }

  let bitIndex = 0;
  for (let i = 0; i < data.length && bitIndex < binaryData.length; i++) {
    if (i % 4 === 3) continue;
    data[i] = (data[i] & 0xFE) | parseInt(binaryData[bitIndex]);
    bitIndex++;
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png');
}

/**
 * Extracts data from an image file using LSB steganography.
 */
export async function extractDataFromImage(
  imageFile: File,
  password: string,
  canvas: HTMLCanvasElement
): Promise<StegoResult> {
  const img = new Image();
  img.src = URL.createObjectURL(imageFile);
  
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
  });

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error("Context not found");

  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0);

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  let binaryData = "";
  // Extract first 32 bits for length
  let bitCount = 0;
  for (let i = 0; i < data.length && bitCount < 32; i++) {
    if (i % 4 === 3) continue;
    binaryData += (data[i] & 1).toString();
    bitCount++;
  }

  const payloadLength = parseInt(binaryData, 2);
  if (isNaN(payloadLength) || payloadLength <= 0 || payloadLength > 1000000) {
    throw new Error("No hidden data found or invalid format.");
  }

  // Extract payload bits
  const payloadBytes = new Uint8Array(payloadLength);
  let bitsFound = 0;
  let bitsSkipped = 0;
  
  for (let i = 0; i < data.length && bitsFound < payloadLength * 8; i++) {
    if (i % 4 === 3) continue;
    if (bitsSkipped < 32) {
      bitsSkipped++;
      continue;
    }
    
    const byteIndex = Math.floor(bitsFound / 8);
    const bitInByte = 7 - (bitsFound % 8);
    if (data[i] & 1) {
      payloadBytes[byteIndex] |= (1 << bitInByte);
    }
    bitsFound++;
  }

  const decoder = new TextDecoder();
  const prefix = decoder.decode(payloadBytes.slice(0, 4));
  
  if (prefix !== "ENC:") {
    throw new Error("No hidden data found or invalid format.");
  }

  const encryptedData = payloadBytes.slice(4);
  const keyBytes = new TextEncoder().encode(password);
  const decryptedBytes = new Uint8Array(encryptedData.length);
  
  for (let i = 0; i < encryptedData.length; i++) {
    decryptedBytes[i] = encryptedData[i] ^ keyBytes[i % keyBytes.length];
  }

  const decryptedPayload = decoder.decode(decryptedBytes);
  
  try {
    const result = JSON.parse(decryptedPayload);
    return {
      name: result.name,
      data: result.data,
      size: imageFile.size
    };
  } catch (e) {
    throw new Error("Invalid password or corrupted data.");
  }
}
