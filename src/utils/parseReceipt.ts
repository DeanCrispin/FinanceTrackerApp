import type { Block, TextLine } from '@infinitered/react-native-mlkit-text-recognition';

export type ReceiptData = {
    amount: number | null;
};

function extractAmount(text: string): number | null {
    const matches = [...text.replace(/,/g, '').matchAll(/(?:\$\s*)?(\d+(?:\.\d{2}))/g)];
    for (const match of matches) {
        const amount = Number.parseFloat(match[1]);
        if (amount > 0 && amount <= 100_000) return amount;
    }
    return null;
}

function amountToRight(label: TextLine, lines: TextLine[]): number | null {
    const labelCenterY = (label.frame.top + label.frame.bottom) / 2;
    const labelHeight = label.frame.bottom - label.frame.top;

    const candidate = lines
        .filter((line) => line !== label && extractAmount(line.text) !== null)
        .filter((line) => {
            const centerY = (line.frame.top + line.frame.bottom) / 2;
            const lineHeight = line.frame.bottom - line.frame.top;
            return line.frame.left >= label.frame.right - 8 &&
                Math.abs(centerY - labelCenterY) <= Math.max(labelHeight, lineHeight);
        })
        .sort((a, b) => a.frame.left - b.frame.left)[0];

    return candidate ? extractAmount(candidate.text) : null;
}

export function parseReceipt(text: string, blocks: Block[] = []): ReceiptData {
    const positionedLines = blocks.flatMap((block) => block.lines);
    const totalLabels = positionedLines
        .filter((line) => /\btotal\b/i.test(line.text) && !/\bsub\s*total\b/i.test(line.text))
        .sort((a, b) => b.frame.top - a.frame.top);

    for (const label of totalLabels) {
        // ML Kit sometimes returns the label and value as one line. In that
        // case, only inspect the text following "Total".
        const textAfterTotal = label.text.replace(/^.*?\btotal\b\s*[:\-]?/i, '');
        const sameLineAmount = extractAmount(textAfterTotal);
        if (sameLineAmount !== null) return { amount: sameLineAmount };

        const rightSideAmount = amountToRight(label, positionedLines);
        if (rightSideAmount !== null) return { amount: rightSideAmount };
    }

    // This fallback handles OCR engines that return text without usable frames,
    // while still requiring the amount to appear after Total on the same row.
    const textLines = text.replace(/\r/g, '').split('\n');
    for (let index = textLines.length - 1; index >= 0; index--) {
        const line = textLines[index];
        if (!/\btotal\b/i.test(line) || /\bsub\s*total\b/i.test(line)) continue;
        const amount = extractAmount(line.replace(/^.*?\btotal\b\s*[:\-]?/i, ''));
        if (amount !== null) return { amount };
    }

    return { amount: null };
}
