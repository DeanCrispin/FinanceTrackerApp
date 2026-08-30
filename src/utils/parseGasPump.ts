export type GasPumpData = {
    price: number | null;
    gallons: number | null;
};

/**
 * Extract all numbers from a line of OCR text.
 *
 * Examples:
 * "20.58"       -> [20.58]
 * "$20.58"      -> [20.58]
 * "6.405"       -> [6.405]
 * "Buy ANY 3"   -> [3]
 */
function extractNumbers(line: string): number[] {
    const matches = line.match(/\d+(?:\.\d+)?/g);

    if (!matches) {
        return [];
    }

    return matches
        .map(value => parseFloat(value))
        .filter(value => !Number.isNaN(value));
}

/**
 * Sometimes OCR reads:
 *
 * 6.405
 *
 * as:
 *
 * 6405
 *
 * Gas pumps normally display gallons with 3 decimal places,
 * so values larger than 100 are assumed to have lost
 * their decimal point.
 */
function normalizeGallons(value: number): number {
    if (value > 100) {
        return value / 1000;
    }

    return value;
}

/**
 * Parse OCR text from a gas pump image.
 */
export function parseGasPump(text: string): GasPumpData {
    console.log("========== RAW OCR TEXT ==========");
    console.log(text);
    console.log("==================================");

    /*
     * Normalize OCR output.
     */
    const cleaned = text
        .replace(/\r/g, "")
        .replace(/,/g, ".")
        .replace(/\$/g, "")
        .trim();

    const lines = cleaned
        .split("\n")
        .map(line => line.trim())
        .filter(line => line.length > 0);

    console.log("========== OCR LINES ==========");
    console.log(lines);
    console.log("================================");

    let price: number | null = null;
    let gallons: number | null = null;

    /*
     * --------------------------------------------------
     * FIND PRICE
     * --------------------------------------------------
     *
     * Gas pumps normally have:
     *
     * This Sale
     * 20.58
     *
     * So we search for "This Sale" and then search
     * the next few lines for a reasonable dollar amount.
     */

    const saleIndex = lines.findIndex(line =>
        /this\s*sale/i.test(line)
    );

    if (saleIndex !== -1) {
        for (
            let i = saleIndex;
            i < Math.min(saleIndex + 4, lines.length);
            i++
        ) {
            const numbers = extractNumbers(lines[i]);

            for (const number of numbers) {
                /*
                 * Avoid tiny advertisement numbers like:
                 *
                 * 3
                 * 10
                 *
                 * A gas purchase is usually at least a few dollars.
                 */
                if (number >= 5 && number <= 500) {
                    price = number;
                    break;
                }
            }

            if (price !== null) {
                break;
            }
        }
    }

    /*
     * --------------------------------------------------
     * FIND GALLONS
     * --------------------------------------------------
     *
     * Pump displays usually look like:
     *
     * 6.405
     * Gallons
     *
     * So search for "Gallons" and then look backwards.
     */

    const gallonIndex = lines.findIndex(line =>
        /\bgallons?\b/i.test(line)
    );

    if (gallonIndex !== -1) {
        for (
            let i = gallonIndex;
            i >= Math.max(0, gallonIndex - 3);
            i--
        ) {
            const numbers = extractNumbers(lines[i]);

            /*
             * Work backwards through numbers on the line.
             */
            for (let j = numbers.length - 1; j >= 0; j--) {
                let number = numbers[j];

                number = normalizeGallons(number);

                /*
                 * Reasonable gallons range.
                 */
                if (number > 0 && number <= 100) {
                    /*
                     * Don't accidentally reuse the price.
                     */
                    if (
                        price !== null &&
                        Math.abs(number - price) < 0.0001
                    ) {
                        continue;
                    }

                    gallons = number;
                    break;
                }
            }

            if (gallons !== null) {
                break;
            }
        }
    }

    /*
     * --------------------------------------------------
     * FALLBACK PRICE SEARCH
     * --------------------------------------------------
     *
     * If ML Kit completely misses "This Sale",
     * try finding a decimal-looking dollar value.
     */

    if (price === null) {
        for (const line of lines) {
            const matches = line.match(/\d+\.\d{2}\b/g);

            if (!matches) {
                continue;
            }

            for (const match of matches) {
                const number = parseFloat(match);

                if (number >= 5 && number <= 500) {
                    price = number;
                    break;
                }
            }

            if (price !== null) {
                break;
            }
        }
    }

    /*
     * --------------------------------------------------
     * FALLBACK GALLONS SEARCH
     * --------------------------------------------------
     *
     * Look specifically for a number with 3 decimal
     * places, which is common on gas pumps.
     */

    if (gallons === null) {
        for (const line of lines) {
            const matches = line.match(/\d+\.\d{3}\b/g);

            if (!matches) {
                continue;
            }

            for (const match of matches) {
                const number = parseFloat(match);

                if (number > 0 && number <= 100) {
                    gallons = number;
                    break;
                }
            }

            if (gallons !== null) {
                break;
            }
        }
    }

    console.log("========== PARSED GAS PUMP ==========");
    console.log("Price:", price);
    console.log("Gallons:", gallons);
    console.log("=====================================");

    return {
        price,
        gallons,
    };
}