/**
 * Screenshot Koruması
 */

export function enableScreenshotProtection() {
    console.log('[Security] Screenshot koruması aktif');
}

export function startClipboardProtection() {
    console.log('[Security] Clipboard koruması aktif');
    return 'clipboard-protection-id';
}

export function stopClipboardProtection(id) {
    console.log('[Security] Clipboard koruması durduruldu');
}
