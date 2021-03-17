import { Annotations, CfnParameter, Construct } from '@aws-cdk/core';
import { StringParameter } from '@aws-cdk/aws-ssm';

export interface IState {
  readonly name: string;
  readonly value: string;
}

export interface SsmStateProps {
  name: string;
  value?: string;
}

export class SsmState extends Construct implements IState {
  readonly name: string;
  readonly value: string;
  readonly rawValue?: string;
  readonly param: StringParameter;

  constructor(scope: Construct, id: string, props: SsmStateProps) {
    super(scope, id);

    const { name, value } = props;
    let _value = value;

    if (_value) {
      Annotations.of(this).addInfo(`Using '${_value}' value for ${name} state.`);
    } else {
      const param = new CfnParameter(this, 'CurrentState', {
        type: 'AWS::SSM::Parameter::Value<String>',
        default: name,
      });
      _value = param.valueAsString;
      Annotations.of(this).addInfo(`Using Current value for ${name} state.`);
    }

    this.param = new StringParameter(this, 'State', {
      parameterName: name,
      stringValue: _value,
    });

    this.name = name;
    this.value = this.param.stringValue;
    this.rawValue = value;
  }
}
