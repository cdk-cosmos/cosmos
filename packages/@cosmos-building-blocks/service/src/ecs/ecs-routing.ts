import { Construct, Stack } from '@aws-cdk/core';
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

export const getRoutingPriorityFromListenerProps = (
  scope: Construct,
  props: Partial<ApplicationListenerRuleProps>
): number => {
  const { hostHeader, pathPattern, pathPatterns, conditions } = props;
  const routes: string[] = [];

  if (hostHeader) routes.push(hostHeader);
  if (pathPattern) routes.push(pathPattern);
  if (pathPatterns) routes.push(...pathPatterns);

  if (conditions) {
    const render = conditions.map((x) => x.renderRawCondition() as ListenerConditionRender);
    const hosts = render
      .filter((x) => x.field === 'host-header')
      .map((x) => x.hostHeaderConfig?.values)
      .flat()
      .filter((x) => x) as string[];
    const paths = render
      .filter((x) => x.field === 'path-pattern')
      .map((x) => x.pathPatternConfig?.values)
      .flat()
      .filter((x) => x) as string[];
    if (hosts) routes.push(...hosts);
    if (paths) routes.push(...paths);
  }

  const stack = Stack.of(scope);
  const rendered = routes.map((x) => {
    const r = stack.resolve(x);
    return typeof r !== 'string' ? JSON.stringify(r) : r;
  });

  return getRoutingPriority(rendered);
};

export const getRoutingPriority = (routes: string[]): number => {
  const val = !routes.length ? 0 : routes.map(getStringValue).reduce((r, v) => r + v);

  const outMin = 1000; // Offset
  const outMax = 50000;

  const mappedValue = Math.floor(outMax - val);
  if (mappedValue < outMin) throw new Error('Routing Pirority is outside of boundry, please set manually.');
  return mappedValue;
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
