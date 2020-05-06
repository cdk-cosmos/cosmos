export const getRoutingPriority = (props: { hostHeader?: string; pathPattern?: string }): number => {
  const path = getStringValue(props.pathPattern);
  const host = getStringValue(props.hostHeader);
  const count = 2;
  const total = path + host;
  const inMin = 0 * count;
  const inMax = 128 * charMapping.length * count;
  const outMin = 1000; // Offset
  const outMax = Math.min(inMax + outMin, 50000); // only use and many as needed ?

  // Since lower numbers are more important in Listener Rules for ALB, then flip out min and max
  return mapNumber(total, inMin, inMax, outMax, outMin);
};

const mapNumber = (value: number, inMin: number, inMax: number, outMin: number, outMax: number): number => {
  return Math.floor(((value - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin);
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
