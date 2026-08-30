import type { Block, TextLine } from '@infinitered/react-native-mlkit-text-recognition';

export type DoorDashData = {
    revenue: number | null;
    dashTimeHours: number | null;
    dashTimeMinutes: number | null;
    dashTimeTotalMinutes: number | null;
    completedDeliveries: number | null;
    miles: number | null;
};

/**
 * Extract a money value from text.
 *
 * Examples:
 *
 * "$244.34" -> 244.34
 * "244.34"  -> 244.34
 */
function extractMoney(text: string): number | null {
    const match = text.match(/\$?\s*(\d+(?:\.\d{2}))/);

    if (!match) {
        return null;
    }

    const value = parseFloat(match[1]);

    if (Number.isNaN(value)) {
        return null;
    }

    return value;
}

/**
 * Parse a DoorDash time such as:
 *
 * 15h 26m
 * 15 h 26 m
 * 15h26m
 */
function extractDashTime(
    text: string
): {
    hours: number;
    minutes: number;
} | null {
    const match = text.match(
        /(\d+)\s*h(?:ours?)?\s*(\d+)\s*m(?:in(?:utes?)?)?/i
    );

    if (!match) {
        return null;
    }

    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);

    if (
        Number.isNaN(hours) ||
        Number.isNaN(minutes)
    ) {
        return null;
    }

    return {
        hours,
        minutes,
    };
}

/**
 * Gets the first integer from a string.
 *
 * Example:
 *
 * "Completed deliveries 28"
 *
 * returns:
 *
 * 28
 */
function extractInteger(text: string): number | null {
    const match = text.match(/\b\d+\b/);

    if (!match) {
        return null;
    }

    const value = parseInt(match[0], 10);

    if (Number.isNaN(value)) {
        return null;
    }

    return value;
}

function extractNumber(text: string): number | null {
    const match = text.match(/\d+(?:\.\d+)?/);

    if (!match) {
        return null;
    }

    const value = Number(match[0]);
    return Number.isNaN(value) ? null : value;
}

function findLineToRight(
    labelLine: TextLine,
    lines: TextLine[],
    extractValue: (text: string) => unknown
): TextLine | null {
    const labelCenterY = (labelLine.frame.top + labelLine.frame.bottom) / 2;
    const labelHeight = labelLine.frame.bottom - labelLine.frame.top;

    return (
        lines
            .filter((line) => line !== labelLine && extractValue(line.text) !== null)
            .filter((line) => {
                const centerY = (line.frame.top + line.frame.bottom) / 2;
                const lineHeight = line.frame.bottom - line.frame.top;
                const isSameRow =
                    Math.abs(centerY - labelCenterY) <= Math.max(labelHeight, lineHeight);
                const isToRight = line.frame.left >= labelLine.frame.right - 8;
                return isSameRow && isToRight;
            })
            .sort((a, b) => a.frame.left - b.frame.left)[0] ?? null
    );
}

/**
 * Parse DoorDash earnings screenshot OCR.
 */
export function parseDoorDash(
    text: string,
    blocks: Block[] = []
): DoorDashData {
    console.log(
        "========== RAW DOORDASH OCR =========="
    );

    console.log(text);

    console.log(
        "======================================"
    );

    /*
     * Clean the OCR text.
     */
    const cleaned = text
        .replace(/\r/g, "")
        .replace(/,/g, "")
        .trim();

    const lines = cleaned
        .split("\n")
        .map(line => line.trim())
        .filter(line => line.length > 0);

    const positionedLines = blocks.flatMap(block => block.lines);

    console.log(
        "========== DOORDASH OCR LINES =========="
    );

    console.log(lines);

    console.log(
        "========================================"
    );

    let revenue: number | null = null;

    let dashTimeHours: number | null = null;

    let dashTimeMinutes: number | null = null;

    let completedDeliveries: number | null = null;

    let miles: number | null = null;

    /*
     * ==================================================
     * TOTAL REVENUE
     * ==================================================
     *
     * The large weekly earnings number is normally near
     * the top of the screenshot.
     *
     * Example:
     *
     * Jun 22 - Jun 28
     * $244.34
     * Active time
     *
     * So we look for the FIRST dollar value.
     *
     * This prevents numbers such as:
     *
     * $8.39
     * $31.20
     * $74.40
     *
     * from being mistaken for total earnings.
     */

    const revenueLines = positionedLines.length > 0
        ? [...positionedLines]
              .sort((a, b) => a.frame.top - b.frame.top || a.frame.left - b.frame.left)
              .map(line => line.text)
        : lines;

    for (const line of revenueLines) {
        const money = extractMoney(line);

        if (money !== null) {
            revenue = money;
            break;
        }
    }

    /*
     * ==================================================
     * DASH TIME
     * ==================================================
     *
     * OCR might return:
     *
     * Dash time
     * 15h 26m
     *
     * OR:
     *
     * Dash time 15h 26m
     *
     * We support both.
     */

    const dashLabelLine = positionedLines.find(line => /dash\s*time/i.test(line.text));
    const dashTextLine = dashLabelLine
        ? findLineToRight(dashLabelLine, positionedLines, extractDashTime)
        : null;
    const rawDashLine = lines.find(line => /dash\s*time/i.test(line));
    const dashTime = dashLabelLine
        ? extractDashTime(dashLabelLine.text) ??
          (dashTextLine ? extractDashTime(dashTextLine.text) : null)
        : rawDashLine
          ? extractDashTime(rawDashLine)
          : null;

    if (dashTime !== null) {
        dashTimeHours = dashTime.hours;
        dashTimeMinutes = dashTime.minutes;
    }

    /*
     * ==================================================
     * COMPLETED DELIVERIES
     * ==================================================
     *
     * OCR might return:
     *
     * Completed deliveries
     * 28
     *
     * OR:
     *
     * Completed deliveries 28
     */

    const deliveriesLabelLine = positionedLines.find(line =>
        /completed\s*deliver/i.test(line.text)
    );

    if (deliveriesLabelLine) {
        const sameLineText = deliveriesLabelLine.text.replace(
            /completed\s*deliver(?:y|ies)/i,
            ''
        );
        completedDeliveries = extractInteger(sameLineText);

        if (completedDeliveries === null) {
            const valueLine = findLineToRight(
                deliveriesLabelLine,
                positionedLines,
                extractInteger
            );
            completedDeliveries = valueLine ? extractInteger(valueLine.text) : null;
        }
    } else {
        const sameLine = lines.find(line => /completed\s*deliver/i.test(line));
        completedDeliveries = sameLine
            ? extractInteger(sameLine.replace(/completed\s*deliver(?:y|ies)/i, ''))
            : null;
    }

    const milesIndex = lines.findIndex(line => /\bmiles?\b/i.test(line));

    if (milesIndex !== -1) {
        miles = extractNumber(lines[milesIndex].replace(/\bmiles?\b/i, ''));

        if (miles === null) {
            const nearbyLines = [lines[milesIndex + 1], lines[milesIndex - 1]].filter(Boolean);

            for (const line of nearbyLines) {
                miles = extractNumber(line);
                if (miles !== null) break;
            }
        }
    }

    /*
     * Convert:
     *
     * 15h 26m
     *
     * into:
     *
     * 926 minutes
     *
     * This is useful later when calculating things
     * such as hourly income.
     */
    let dashTimeTotalMinutes: number | null =
        null;

    if (
        dashTimeHours !== null &&
        dashTimeMinutes !== null
    ) {
        dashTimeTotalMinutes =
            dashTimeHours * 60 +
            dashTimeMinutes;
    }

    console.log(
        "========== PARSED DOORDASH =========="
    );

    console.log("Revenue:", revenue);

    console.log(
        "Dash Time:",
        dashTimeHours,
        "hours",
        dashTimeMinutes,
        "minutes"
    );

    console.log(
        "Dash Time Total Minutes:",
        dashTimeTotalMinutes
    );

    console.log(
        "Completed Deliveries:",
        completedDeliveries
    );

    console.log(
        "====================================="
    );

    return {
        revenue,
        dashTimeHours,
        dashTimeMinutes,
        dashTimeTotalMinutes,
        completedDeliveries,
        miles,
    };
}
