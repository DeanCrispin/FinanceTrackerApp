import type { OCRResult } from './ocr';

export async function readTextFromImage(_imageUri: string): Promise<OCRResult> {
    throw new Error(
        'Image text recognition is only available in the Android and iOS app. Use manual entry on web.'
    );
}
