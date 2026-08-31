import type { Block, TextLine } from '@infinitered/react-native-mlkit-text-recognition';

export type UberEatsData = {
    earnings: number | null;
    onlineMinutes: number | null;
    deliveries: number | null;
};

function extractMoney(text: string): number | null {
    const match = text.replace(/,/g, '').match(/\$?\s*(\d+(?:\.\d{2}))/);
    if (!match) return null;
    const value = Number(match[1]);
    return Number.isFinite(value) ? value : null;
}

function extractDuration(text: string): number | null {
    const match = text.match(/(?:(\d+)\s*h(?:ours?)?)?\s*(?:(\d+)\s*m(?:in(?:utes?)?)?)?/i);
    if (!match || (!match[1] && !match[2])) return null;
    return Number(match[1] ?? 0) * 60 + Number(match[2] ?? 0);
}

function extractInteger(text: string): number | null {
    const match = text.match(/\b\d+\b/);
    return match ? Number(match[0]) : null;
}

function findBelow(label: TextLine, lines: TextLine[], extract: (text: string) => number | null): TextLine | null {
    return lines
        .filter(line => line !== label && extract(line.text) !== null)
        .filter(line => line.frame.top >= label.frame.bottom - 8 &&
            line.frame.right >= label.frame.left - 8 && line.frame.left <= label.frame.right + 8)
        .sort((a, b) => a.frame.top - b.frame.top)[0] ?? null;
}

function findRight(label: TextLine, lines: TextLine[], extract: (text: string) => number | null): TextLine | null {
    const labelCenterY = (label.frame.top + label.frame.bottom) / 2;
    const labelHeight = label.frame.bottom - label.frame.top;
    return lines
        .filter(line => line !== label && extract(line.text) !== null)
        .filter(line => {
            const centerY = (line.frame.top + line.frame.bottom) / 2;
            const lineHeight = line.frame.bottom - line.frame.top;
            return line.frame.left >= label.frame.right - 8 &&
                Math.abs(centerY - labelCenterY) <= Math.max(labelHeight, lineHeight);
        })
        .sort((a, b) => a.frame.left - b.frame.left)[0] ?? null;
}

export function parseUberEats(text: string, blocks: Block[] = []): UberEatsData {
    const textLines = text.replace(/\r/g, '').split('\n').map(line => line.trim()).filter(Boolean);
    const positionedLines = blocks.flatMap(block => block.lines);

    let earnings: number | null = null;
    let onlineMinutes: number | null = null;
    let deliveries: number | null = null;

    const onlineLabel = positionedLines.find(line => /^online\b/i.test(line.text.trim()));
    if (onlineLabel) {
        onlineMinutes = extractDuration(onlineLabel.text.replace(/^online\b/i, ''));
        if (onlineMinutes === null) {
            const valueLine = findBelow(onlineLabel, positionedLines, extractDuration);
            onlineMinutes = valueLine ? extractDuration(valueLine.text) : null;
        }
    }

    const tripsLabel = positionedLines.find(line => /^trips?\b/i.test(line.text.trim()));
    if (tripsLabel) {
        deliveries = extractInteger(tripsLabel.text.replace(/^trips?\b/i, ''));
        if (deliveries === null) {
            const valueLine = findBelow(tripsLabel, positionedLines, extractInteger);
            deliveries = valueLine ? extractInteger(valueLine.text) : null;
        }
    }

    const earningsLabel = positionedLines.find(line => /total\s*earnings?/i.test(line.text));
    if (earningsLabel) {
        earnings = extractMoney(earningsLabel.text.replace(/total\s*earnings?/i, ''));
        if (earnings === null) {
            const valueLine = findRight(earningsLabel, positionedLines, extractMoney);
            earnings = valueLine ? extractMoney(valueLine.text) : null;
        }
    }

    const onlineIndex = textLines.findIndex(line => /^online\b/i.test(line));
    if (onlineMinutes === null && onlineIndex >= 0) {
        onlineMinutes = extractDuration(textLines[onlineIndex].replace(/^online\b/i, '')) ??
            extractDuration(textLines[onlineIndex + 1] ?? '');
    }

    const tripsIndex = textLines.findIndex(line => /^trips?\b/i.test(line));
    if (deliveries === null && tripsIndex >= 0) {
        deliveries = extractInteger(textLines[tripsIndex].replace(/^trips?\b/i, '')) ??
            extractInteger(textLines[tripsIndex + 1] ?? '');
    }

    const earningsIndex = textLines.findIndex(line => /total\s*earnings?/i.test(line));
    if (earnings === null && earningsIndex >= 0) {
        earnings = extractMoney(textLines[earningsIndex].replace(/total\s*earnings?/i, '')) ??
            extractMoney(textLines[earningsIndex + 1] ?? '');
    }

    console.log('========== PARSED UBER EATS ==========', { earnings, onlineMinutes, deliveries });
    return { earnings, onlineMinutes, deliveries };
}
