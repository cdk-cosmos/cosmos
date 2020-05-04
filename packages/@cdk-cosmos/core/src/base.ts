import { IConstruct, CfnResource } from '@aws-cdk/core';
import { Construct, ConstructNode } from '@aws-cdk/core/lib/construct-compat';
import { Stack, StackProps } from '@aws-cdk/core/lib/stack';

const COSMOS_PARTITION = 'COSMOS_PARTITION';
const COSMOS_VERSION = 'COSMOS_VERSION';
const DEFAULT_PATTERN = '{Resource}+';
const STACK_PATTERN = '{Partition}{Cosmos}{Galaxy}?{SolarSystem}?{Version}?{Type}';

declare module '@aws-cdk/core/lib/construct-compat' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface ConstructNode {
    id: string;
    type: string;
    pattern: string;
  }
}

ConstructNode.prototype.type = 'Resource';

export interface BaseStackProps extends StackProps {
  partition?: string;
  version?: string;
  type: string;
  disableCosmosNaming?: boolean;
}

export class BaseStack extends Stack {
  private disableCosmosNaming: boolean;

  constructor(scope: Construct, id: string, props: BaseStackProps) {
    const { partition, version, type, disableCosmosNaming = false } = props;

    const stackName = generateLogicalId({
      scopes: [...getScopes(scope), { key: type, value: id }, { key: 'Type', value: type }],
      pattern: STACK_PATTERN,
      partition: partition,
      version: version,
    });

    super(scope, id, {
      stackName,
      ...props,
    });

    this.node.type = type;
    if (partition) this.node.setContext(COSMOS_PARTITION, partition);
    if (version) this.node.setContext(COSMOS_VERSION, version);
    this.disableCosmosNaming = disableCosmosNaming;
  }

  public allocateLogicalId(scope: CfnResource): string {
    if (this.disableCosmosNaming) return super.allocateLogicalId(scope);

    return generateLogicalId({
      scopes: getScopes(scope),
      pattern: getPattern(scope) || DEFAULT_PATTERN,
      partition: scope.node.tryGetContext(COSMOS_PARTITION),
      version: scope.node.tryGetContext(COSMOS_VERSION),
    });
  }
}

interface IScope {
  key: string;
  value: string;
}

interface GenerateLogicalIdProps {
  scopes: IScope[];
  pattern: string;
  partition?: string;
  version?: string;
}

export function generateLogicalId(props: GenerateLogicalIdProps): string {
  const { scopes, pattern, partition, version } = props;

  if (partition) scopes.push({ key: 'Partition', value: partition });
  if (version) scopes.push({ key: 'Version', value: version });

  const selectedIds = selectScoped(scopes, pattern)
    .map(x => x.value)
    .reduce(removeDupes, [])
    .filter(removeHidden)
    .map(removeNonAlphanumeric);

  return selectedIds.join('').slice(0, 240);
}

function selectScoped(scopes: IScope[], pattern: string): IScope[] {
  const regex = /{(\w+)}([*+?])?/gm;
  const results: IScope[] = [];
  let segment: RegExpExecArray | null;
  while ((segment = regex.exec(pattern)) !== null) {
    const key: string = segment[1];
    const selector: string | undefined = segment[2];

    switch (selector) {
      case '*': {
        const selected = scopes.filter(x => x.key === key);
        if (selected.length) results.push(...selected);
        break;
      }
      case '+': {
        if (!scopes.some(x => x.key === key)) throw new Error(`No ${key} Scope found`);
        results.push(...scopes.filter(x => x.key === key));
        break;
      }
      case '?': {
        const selected = scopes.filter(x => x.key === key).pop();
        if (selected) results.push(selected);
        break;
      }
      default: {
        const selected = scopes.filter(x => x.key === key).pop();
        if (!selected) throw new Error(`No ${key} Scope found`);
        results.push(selected);
      }
    }
  }

  return results;
}

function getScopes(scope: IConstruct): IScope[] {
  const scopes = scope.node.scopes
    .filter(x => x.node.id && x.node.type)
    .map(x => ({
      key: x.node.type,
      value: x.node.id,
    }));

  if (scope.node.type) scopes.push({ key: 'Type', value: scope.node.type });

  return scopes;
}

function getPattern(scope: IConstruct): string | undefined {
  return scope.node.scopes
    .map(x => x.node.pattern)
    .filter(x => x)
    .pop();
}

function removeDupes(result: string[], component: string): string[] {
  if (result.length === 0 || !result[result.length - 1].endsWith(component)) {
    result.push(component);
  }

  return result;
}

function removeHidden(value: string): boolean {
  if (value === 'Default' || value === 'Resource') return false;
  return true;
}

function removeNonAlphanumeric(s: string): string {
  return s.replace(/[^A-Za-z0-9]/g, '');
}

// ---- ---- ---- ----

// /**
//  * Resources with this ID are hidden from humans
//  *
//  * They do not appear in the human-readable part of the logical ID,
//  * but they are included in the hash calculation.
//  */
// const HIDDEN_FROM_HUMAN_ID = 'Resource';

// /**
//  * Resources with this ID are complete hidden from the logical ID calculation.
//  */
// const HIDDEN_ID = 'Default';

// const PATH_SEP = '/';

// const HASH_LEN = 8;
// const MAX_HUMAN_LEN = 240; // max ID len is 255
// const MAX_ID_LEN = 255;

// /**
//  * Calculates a unique ID for a set of textual components.
//  *
//  * This is done by calculating a hash on the full path and using it as a suffix
//  * of a length-limited "human" rendition of the path components.
//  *
//  * @param components The path components
//  * @returns a unique alpha-numeric identifier with a maximum length of 255
//  */
// export function makeUniqueId(components: string[]) {
//   components = components.filter(x => x !== HIDDEN_ID);

//   if (components.length === 0) {
//     throw new Error('Unable to calculate a unique id for an empty set of components');
//   }

//   // Lazy require in order to break a module dependency cycle
//   const unresolvedTokens = components.filter(c => unresolved(c));
//   if (unresolvedTokens.length > 0) {
//     throw new Error(`ID components may not include unresolved tokens: ${unresolvedTokens.join(',')}`);
//   }

//   // top-level resources will simply use the `name` as-is in order to support
//   // transparent migration of cloudformation templates to the CDK without the
//   // need to rename all resources.
//   if (components.length === 1) {
//     // we filter out non-alpha characters but that is actually a bad idea
//     // because it could create conflicts ("A-B" and "AB" will render the same
//     // logical ID). sadly, changing it in the 1.x version line is impossible
//     // because it will be a breaking change. we should consider for v2.0.
//     // https://github.com/aws/aws-cdk/issues/6421
//     const candidate = removeNonAlphanumeric(components[0]);

//     // if our candidate is short enough, use it as is. otherwise, fall back to
//     // the normal mode.
//     if (candidate.length <= MAX_ID_LEN) {
//       return candidate;
//     }
//   }

//   const hash = pathHash(components);
//   const human = removeDupes(components)
//     .filter(x => x !== HIDDEN_FROM_HUMAN_ID)
//     .map(removeNonAlphanumeric)
//     .join('')
//     .slice(0, MAX_HUMAN_LEN);

//   return human + hash;
// }

// /**
//  * Take a hash of the given path.
//  *
//  * The hash is limited in size.
//  */
// function pathHash(path: string[]): string {
//   const md5 = crypto
//     .createHash('md5')
//     .update(path.join(PATH_SEP))
//     .digest('hex');
//   return md5.slice(0, HASH_LEN).toUpperCase();
// }

// /**
//  * Removes all non-alphanumeric characters in a string.
//  */
// function removeNonAlphanumeric(s: string) {
//   return s.replace(/[^A-Za-z0-9]/g, '');
// }

/**
 * Remove duplicate "terms" from the path list
 *
 * If the previous path component name ends with this component name, skip the
 * current component.
 */
// function removeDupes(path: string[]): string[] {
//   const ret = new Array<string>();

//   for (const component of path) {
//     if (ret.length === 0 || !ret[ret.length - 1].endsWith(component)) {
//       ret.push(component);
//     }
//   }

//   return ret;
// }
