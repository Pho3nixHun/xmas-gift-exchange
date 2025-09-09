export interface AnonymousBox {
  id: string;
  actualName: string;
  color: string;
  icon: string;
}

const BOX_COLORS = [
  'from-red-500 to-red-700',
  'from-green-500 to-green-700',
  'from-blue-500 to-blue-700',
  'from-purple-500 to-purple-700',
  'from-yellow-500 to-yellow-600',
  'from-pink-500 to-pink-700',
  'from-indigo-500 to-indigo-700',
  'from-teal-500 to-teal-700',
  'from-gray-400 to-gray-600',
  'from-orange-500 to-orange-700',
  'from-cyan-500 to-cyan-700',
  'from-violet-500 to-violet-700'
];

const BOX_ICONS = ['gift', 'heart', 'star', 'sparkles'];

const randomNumber = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};
const shuffleArray = <T>(array: T[]): T[] => {
  return array.toSorted(() => Math.random() - 0.5);
};

export const createAnonymousBoxes = (
  availableNames: string[]
): AnonymousBox[] => {
  return shuffleArray(availableNames).map((name, index) => {
    const colorIndex = randomNumber(0, BOX_COLORS.length - 1);
    const iconIndex = randomNumber(0, BOX_ICONS.length - 1);

    return {
      id: `box-${index}`,
      actualName: name,
      color: BOX_COLORS[colorIndex],
      icon: BOX_ICONS[iconIndex]
    };
  });
};
