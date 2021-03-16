import { Construct, Lazy } from '@aws-cdk/core';
import { IStringParameter, StringParameter, StringParameterProps } from '@aws-cdk/aws-ssm';
import { isCrossAccount } from './utils';

export class Config extends Construct {
  readonly parent?: Config;
  readonly namespace: string;
  private states: Map<string, IParam>;

  constructor(scope: Construct, id: string, namespace: string, parent?: Config) {
    super(scope, id);

    this.parent = parent;
    this.namespace = namespace;
    this.states = new Map();
  }

  key(id: string): string {
    if (id.startsWith('/')) return id;
    const key = `${this.namespace}/${id}`;
    return this.parent ? this.parent.key(key) : '/' + key;
  }

  getState(id: string, raw = false): IParam | undefined {
    const key = this.key(id);
    if (!this.states.has(key)) {
      if (this.parent) {
        if (isCrossAccount(this, this.parent)) {
          const _state = this.parent.getState(id, true);
          if (_state) {
            const state = new Param(this, id, {
              parameterName: key,
              stringValue: _state.rawStringValue,
            });
            this.states.set(key, state);
          }
        } else {
          const state = this.parent.getState(id, raw);
          if (state) this.states.set(key, state);
        }
      }

      if (!this.states.has(key) && !raw) {
        const state = Param.fromStringParameterAttributes(this, id, {
          parameterName: key,
        }) as IParam;
        this.states.set(key, state);
      }
    }

    const state = this.states.get(key);
    if (!state) return undefined;
    if (raw && !state.rawStringValue) return undefined;
    return state;
  }

  get(id: string, raw = false): string | undefined {
    return Lazy.string({
      produce: () => {
        const state = this.getState(id, raw);
        if (!state) return undefined;
        return raw ? state.rawStringValue : state.stringValue;
      },
    });
  }

  set(id: string, value: string): void {
    const key = this.key(id);
    const state = new Param(this, id, {
      parameterName: key,
      stringValue: value,
    });
    this.states.set(key, state);
  }

  lookup(id: string): string {
    const state = this.getState(id, true);
    if (state) return StringParameter.valueFromLookup(state, state.parameterName);
    return StringParameter.valueFromLookup(this, this.key(id));
  }
}

interface IParam extends IStringParameter, Construct {
  readonly rawStringValue: string;
}

class Param extends StringParameter implements IParam {
  readonly rawStringValue: string;
  readonly parameterName: string;

  constructor(scope: Construct, id: string, props: StringParameterProps) {
    super(scope, id, props);
    this.rawStringValue = props.stringValue;
    this.parameterName = props.parameterName as string;
  }
}
