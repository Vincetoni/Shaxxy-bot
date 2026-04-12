// Level thresholds: 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000...
export function calculateLevel(xp) {
    if (xp < 100) return 1;
    if (xp < 300) return 2;
    if (xp < 800) return 5;
    if (xp < 2000) return 10;
    if (xp < 5000) return 20;
    if (xp < 15000) return 50;
    if (xp < 40000) return 100;
    if (xp < 100000) return 200;
    if (xp < 300000) return 500;
    if (xp < 800000) return 1000;
    return 2000;
}

export function getLevelTitle(level) {
    const titles = {
        1: 'Newbie',
        2: 'Member',
        5: 'Regular',
        10: 'Active',
        20: 'Expert',
        50: 'Veteran',
        100: 'Elite',
        200: 'Master',
        500: 'Legend',
        1000: 'Mythic',
        2000: 'Immortal'
    };
    return titles[level] || 'Godlike';
}

export function getNextLevelXp(currentLevel) {
    const thresholds = {
        1: 100, 2: 300, 5: 800, 10: 2000, 20: 5000,
        50: 15000, 100: 40000, 200: 100000, 500: 300000, 1000: 800000
    };
    return thresholds[currentLevel] || currentLevel * 1000;
}

export function getXpForNextLevel(currentXp) {
    const currentLevel = calculateLevel(currentXp);
    const nextLevelThreshold = getNextLevelXp(currentLevel);
    return {
        current: currentXp,
        needed: nextLevelThreshold,
        remaining: nextLevelThreshold - currentXp,
        percent: Math.floor((currentXp / nextLevelThreshold) * 100)
    };
}