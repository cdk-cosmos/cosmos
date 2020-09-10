import { ApplicationListenerRuleProps } from '@aws-cdk/aws-elasticloadbalancingv2';

interface ListenerConditionRender {
  field: string;
  hostHeaderConfig?: {
    values: string[];
  };
  pathPatternConfig?: {
    values: string[];
  };
}

export const getRoutingPriorityFromListenerProps = (props: Partial<ApplicationListenerRuleProps>): number => {
  let host = props.hostHeader;
  let path = props.pathPattern;

  if (props.conditions) {
    // Note: This solution only supports one value
    const render = props.conditions.map(x => x.renderRawCondition() as ListenerConditionRender);
    host = render.find(x => x.field === 'host-header')?.hostHeaderConfig?.values[0] || host;
    path = render.find(x => x.field === 'path-pattern')?.pathPatternConfig?.values[0] || path;
  }

  return getRoutingPriority({ host, path });
};

export const getRoutingPriority = (props: { host?: string; path?: string }): number => {
  const pathVal = getStringValue(props.path);
  const hostVal = getStringValue(props.host);
  const count = 2;
  const total = pathVal + hostVal;
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
