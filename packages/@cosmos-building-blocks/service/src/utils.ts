export const getRoutingPriority = (props: { hostHeader?: string; pathPattern?: string }): number => {
  const map = (value: number): number => mapNumber(value, 1, 128 * charMapping.length, 5000, 1);

  const path = map(getStringValue(props.pathPattern));
  const host = map(getStringValue(props.hostHeader));
  return Math.floor((path + host) / 2);
};

const mapNumber = (value: number, sMin: number, sMax: number, tMin: number, tMax: number): number => {
  return Math.floor(((value - sMin) / (sMax - sMin)) * (tMax - tMin) + tMin);
};

const getStringValue = (str?: string): number => {
  if (str === undefined) return 0;
  let total = 0;
  for (let i = 0; i <= str.length; i++) {
    total += charMapping.indexOf(str.charAt(i)) + 1;
  }
  return total;
};

const charMapping: string[] = [
  '*',
  '?',
  '&',
  '_',
  '@',
  '+',
  "'",
  '"',
  '~',
  '$',
  '.',
  ':',
  '-',
  'a',
  'b',
  'c',
  'd',
  'e',
  'f',
  'g',
  'h',
  'i',
  'j',
  'k',
  'l',
  'm',
  'n',
  'o',
  'p',
  'q',
  'r',
  's',
  't',
  'u',
  'v',
  'w',
  'x',
  'y',
  'z',
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'L',
  'M',
  'N',
  'O',
  'P',
  'Q',
  'R',
  'S',
  'T',
  'U',
  'V',
  'W',
  'X',
  'Y',
  'Z',
  '0',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '/',
];
