export interface IKeyValue {
  key: string;
  value: string;
}

export function nodeId(props: { context: IKeyValue[]; pattern: string; delimiter: string }): string {
  const { context, pattern, delimiter } = props;
  const selectors = new Selectors(pattern);
  context
    .filter(isNotHidden)
    .filter(isUnique)
    .forEach(x => selectors.visit(x));
  const selectedIds = selectors.render().map(x => x.value);
  return selectedIds.join(delimiter).slice(0, 240);
}

class Selectors {
  private static readonly regex = /{(\w+)}([*+?])?/gm;
  private readonly selectors: Selector[];

  constructor(pattern: string) {
    this.selectors = [];
    this.parsePattern(pattern);
  }

  private parsePattern(pattern: string): void {
    let segment: RegExpExecArray | null;
    while ((segment = Selectors.regex.exec(pattern)) !== null) {
      const key: string = segment[1];
      const selector: string | undefined = segment[2];
      this.selectors.push(new Selector(selector, key));
    }
  }

  public visit(item: IKeyValue): void {
    this.selectors.forEach(x => x.visit(item));
  }

  public render(): IKeyValue[] {
    return this.selectors
      .map(x => x.render())
      .reduce((result, item) => {
        result.push(...item);
        return result;
      }, []);
  }
}
class Selector {
  public readonly selector: string;
  public readonly key: string;
  public readonly items: IKeyValue[];

  constructor(selector: string, key: string) {
    this.selector = selector;
    this.key = key;
    this.items = [];
  }

  public visit(item: IKeyValue): void {
    if (this.key === item.key) this.items.push(item);
  }

  public render(): IKeyValue[] {
    switch (this.selector) {
      case '*':
        return this.items;
      case '+':
        if (!this.items.length) throw new Error(`No ${this.key} found`);
        return this.items;
      case '?':
        if (this.items.length) return [this.items[this.items.length - 1]];
        return [];
      default: {
        if (!this.items.length) throw new Error(`No ${this.key} found.`);
        return [this.items[this.items.length - 1]];
      }
    }
  }
}

// ---- ---- FILTERS ---- ----

const isNotHidden = (item: IKeyValue): boolean => {
  if (item.value === 'Default' || item.value === 'Resource') return false;
  return true;
};

const isUnique = (item: IKeyValue, index: number, context: IKeyValue[]): boolean => {
  const previous = index ? context[index - 1] : null;
  if (previous?.key === item.key && previous.value.endsWith(item.value)) return false;
  return true;
};
