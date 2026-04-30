/**
 * AES-256-CBC Şifreleme
 */

import aesjs from 'aes-js';
import * as Crypto from 'expo-crypto';
import { uint8ArrayToBase64, base64ToUint8Array } from '../utils/helpers';

export async function generateAESKey() {
    const randomBytes = await Crypto.getRandomBytesAsync(32);
    return new Uint8Array(randomBytes);
}

export async function generateIV() {
    const randomBytes = await Crypto.getRandomBytesAsync(16);
    return new Uint8Array(randomBytes);
}

function pkcs7Pad(data) {
    const blockSize = 16;
    const padding = blockSize - (data.length % blockSize);
    const padded = new Uint8Array(data.length + padding);
    padded.set(data);
    for (let i = data.length; i < padded.length; i++) {
        padded[i] = padding;
    }
    return padded;
}

function pkcs7Unpad(data) {
    const padding = data[data.length - 1];
    return data.slice(0, data.length - padding);
}

export async function encryptMessage(plainText, key) {
    try {
        const iv = await generateIV();
        const textBytes = aesjs.utils.utf8.toBytes(plainText);
        const paddedBytes = pkcs7Pad(new Uint8Array(textBytes));
        const aesCbc = new aesjs.ModeOfOperation.cbc(Array.from(key), Array.from(iv));
        const encryptedBytes = aesCbc.encrypt(Array.from(paddedBytes));
        const cipherText = uint8ArrayToBase64(new Uint8Array(encryptedBytes));
        const ivBase64 = uint8ArrayToBase64(iv);

        return { cipherText, iv: ivBase64 };
    } catch (error) {
        console.error('[AES] Şifreleme hatası:', error);
        throw new Error('Mesaj şifrelenemedi');
    }
}

export function decryptMessage(cipherText, ivBase64, key) {
    try {
        const iv = base64ToUint8Array(ivBase64);
        const encryptedBytes = base64ToUint8Array(cipherText);
        const aesCbc = new aesjs.ModeOfOperation.cbc(Array.from(key), Array.from(iv));
        const decryptedBytes = aesCbc.decrypt(Array.from(encryptedBytes));
        const unpaddedBytes = pkcs7Unpad(new Uint8Array(decryptedBytes));
        const plainText = aesjs.utils.utf8.fromBytes(Array.from(unpaddedBytes));

        return plainText;
    } catch (error) {
        console.error('[AES] Çözme hatası:', error);
        throw new Error('Mesaj çözülemedi');
    }
}
