import {
    recognizeText,
    type Block,
} from '@infinitered/react-native-mlkit-text-recognition';

export type  OCRResult = {
    text: string;
    blocks: Block[];
}

export async function readTextFromImage(imageUri: string ): Promise<OCRResult> {
    try {
        const result = await recognizeText(imageUri);
        return {
            text: result.text,
            blocks: result.blocks,
        };
    } catch (error) {
         console.error('ocr error:', error);
         throw new Error('could not read text');
    }
}
