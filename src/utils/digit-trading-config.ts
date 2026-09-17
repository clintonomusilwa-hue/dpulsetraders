export type DigitMarket = readonly [string, string];

/** All known 1-second Volatility Index symbols used by the digit workspace. */
export const DIGIT_MARKETS: DigitMarket[] = [
    ['1HZ10V', 'Volatility 10 (1s) Index'], ['1HZ15V', 'Volatility 15 (1s) Index'], ['1HZ25V', 'Volatility 25 (1s) Index'],
    ['1HZ30V', 'Volatility 30 (1s) Index'], ['1HZ50V', 'Volatility 50 (1s) Index'], ['1HZ75V', 'Volatility 75 (1s) Index'],
    ['1HZ90V', 'Volatility 90 (1s) Index'], ['1HZ100V', 'Volatility 100 (1s) Index'], ['1HZ150V', 'Volatility 150 (1s) Index'],
    ['1HZ200V', 'Volatility 200 (1s) Index'], ['1HZ250V', 'Volatility 250 (1s) Index'], ['1HZ300V', 'Volatility 300 (1s) Index'],
];

export type DigitBotDefinition = {
    id: string; name: string; tier: 'Free' | 'Premium'; contract: 'DIGITOVER' | 'DIGITUNDER' | 'DIGITMATCH' | 'DIGITEVEN';
    barrier: number; lookback: number; minConfidence: number; cooldownTicks: number; description: string;
};

export const DIGIT_BOTS: DigitBotDefinition[] = [
    { id: 'scalperbot', name: 'Scalperbot', tier: 'Free', contract: 'DIGITEVEN', barrier: 5, lookback: 30, minConfidence: 64, cooldownTicks: 2, description: 'Short-window parity scalper with frequency, streak and momentum filters.' },
    { id: 'over-2-under-7', name: 'Over 2 under 7 accurate bot', tier: 'Free', contract: 'DIGITOVER', barrier: 2, lookback: 40, minConfidence: 66, cooldownTicks: 2, description: 'Uses the combined Over 2 / Under 7 edge and skips weak or balanced digit distributions.' },
    { id: 'over-1-under-8-speed', name: 'Over 1 under 8 speed bot', tier: 'Premium', contract: 'DIGITOVER', barrier: 1, lookback: 20, minConfidence: 68, cooldownTicks: 1, description: 'Fast filter using the latest 20 ticks, distribution skew and short streak exhaustion.' },
    { id: 'king-matches-differs', name: 'King of Matches and Differs', tier: 'Premium', contract: 'DIGITMATCH', barrier: 0, lookback: 50, minConfidence: 70, cooldownTicks: 3, description: 'Matches/Differs engine that only emits a signal when frequency and uniqueness agree.' },
];

export const digitFromQuote = (quote: number, pipSize?: number) => {
    const decimals = typeof pipSize === 'number' && pipSize > 0 && pipSize < 1 ? Math.max(0, Math.round(-Math.log10(pipSize))) : 2;
    const raw = quote.toFixed(decimals).replace(/[^0-9]/g, '');
    return Number(raw.slice(-1));
};

export const evaluateDigitBot = (bot: DigitBotDefinition, digits: number[]) => {
    const sample = digits.slice(-bot.lookback);
    if (sample.length < Math.min(10, bot.lookback)) return { signal: 'WAIT', confidence: 0, reason: 'Collecting live ticks' };
    const counts = Array.from({ length: 10 }, (_, digit) => sample.filter(value => value === digit).length);
    const total = sample.length; const max = Math.max(...counts); const min = Math.min(...counts);
    const maxDigit = counts.indexOf(max); const minDigit = counts.indexOf(min); const last = sample[total - 1];
    let streak = 1; for (let i = total - 2; i >= 0 && sample[i] === last; i--) streak++;
    const recent = sample.slice(-8); const recentAvg = recent.reduce((sum, value) => sum + value, 0) / recent.length; const allAvg = sample.reduce((sum, value) => sum + value, 0) / total;
    const momentum = Math.min(1, Math.abs(recentAvg - allAvg) / 3); const spread = Math.min(1, (max - min) / Math.max(1, total * 0.12)); const exhaustion = Math.min(1, Math.max(0, streak - 2) / 5);
    let signal = 'WAIT';
    if (bot.id === 'scalperbot') {
        const evenRate = sample.filter(value => value % 2 === 0).length / total;
        if (Math.abs(evenRate - 0.5) >= 0.06) signal = evenRate > 0.5 ? 'EVEN' : 'ODD';
    } else if (bot.id === 'over-2-under-7') {
        const over2 = sample.filter(value => value > 2).length / total; const under7 = sample.filter(value => value < 7).length / total;
        if (over2 >= 0.64 && over2 - under7 >= 0.02) signal = 'OVER 2'; else if (under7 >= 0.64 && under7 - over2 >= 0.02) signal = 'UNDER 7';
    } else if (bot.id === 'over-1-under-8-speed') {
        const over1 = sample.filter(value => value > 1).length / total; const under8 = sample.filter(value => value < 8).length / total;
        if (over1 >= 0.70 && over1 - under8 >= 0.03) signal = 'OVER 1'; else if (under8 >= 0.70 && under8 - over1 >= 0.03) signal = 'UNDER 8';
    } else if (bot.id === 'king-matches-differs') {
        if (max / total >= 0.14 && max - min >= 2) signal = `MATCH ${maxDigit}`; else if (min / total <= 0.07 && max - min >= 2) signal = `DIFF ${minDigit}`;
    }
    const confidence = signal === 'WAIT' ? 0 : Math.min(92, Math.round(54 + spread * 15 + momentum * 8 + exhaustion * 8 + Math.min(7, Math.abs(max - min))));
    return { signal, confidence, reason: `${total} ticks • hottest ${maxDigit} (${((max / total) * 100).toFixed(1)}%) • coldest ${minDigit} (${((min / total) * 100).toFixed(1)}%) • streak ${streak}` };
};
