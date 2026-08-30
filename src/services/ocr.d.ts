import type { Block } from '@infinitered/react-native-mlkit-text-recognition';

export type OCRResult = {
    text: string;
    blocks: Block[];
};

export function readTextFromImage(imageUri: string): Promise<OCRResult>;
