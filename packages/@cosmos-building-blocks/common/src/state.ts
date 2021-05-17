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
  readonly param: CfnParameter;
  readonly state: StringParameter;

  constructor(scope: Construct, id: string, props: SsmStateProps) {
    super(scope, id);

    const { name, value } = props;
    let _value: string;

    if (value) {
      _value = value;
      Annotations.of(this).addInfo(`Using '${value}' value for ${name} state.`);
    } else {
      this.param = new CfnParameter(this, 'CurrentValue', {
        type: 'AWS::SSM::Parameter::Value<String>',
        default: name,
      });
      _value = this.param.valueAsString;
      Annotations.of(this).addInfo(`Using Current value for ${name} state.`);
    }

    this.state = new StringParameter(this, 'State', {
      parameterName: name,
      stringValue: _value,
    });

    this.name = name;
    this.value = this.state.stringValue;
    this.rawValue = value;
  }
}
