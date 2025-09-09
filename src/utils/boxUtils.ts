export interface AnonymousBox {
  id: string;
  displayName: string;
  actualName: string;
  color: string;
  icon: string;
}

const BOX_COLORS = [
  "from-red-500 to-red-700",
  "from-green-500 to-green-700", 
  "from-blue-500 to-blue-700",
  "from-purple-500 to-purple-700",
  "from-yellow-500 to-yellow-600",
  "from-pink-500 to-pink-700",
  "from-indigo-500 to-indigo-700",
  "from-teal-500 to-teal-700",
  "from-gray-400 to-gray-600",
  "from-orange-500 to-orange-700",
  "from-cyan-500 to-cyan-700",
  "from-violet-500 to-violet-700"
];

const BOX_ICONS = ["gift", "heart", "star", "sparkles"];

export const createAnonymousBoxes = (
  availableNames: string[], 
  currentUser: string,
  boxThemes: string[]
): AnonymousBox[] => {
  // Create a deterministic but shuffled list based on the user
  // This ensures the same user always sees the same boxes in the same order
  const userSeed = currentUser.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  const boxes: AnonymousBox[] = availableNames.map((name, index) => {
    // Create a deterministic index for this user and name combination
    const themeIndex = (userSeed + name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + index) % boxThemes.length;
    const colorIndex = themeIndex % BOX_COLORS.length;
    const iconIndex = themeIndex % BOX_ICONS.length;
    
    return {
      id: `box-${index}`,
      displayName: boxThemes[themeIndex],
      actualName: name,
      color: BOX_COLORS[colorIndex],
      icon: BOX_ICONS[iconIndex]
    };
  });

  // Shuffle the boxes deterministically for this user
  const shuffled = [...boxes];
  const shuffleRandom = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(shuffleRandom(userSeed + i) * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
};