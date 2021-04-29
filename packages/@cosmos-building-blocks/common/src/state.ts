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

    if (value) {
      this.param = new CfnParameter(this, 'Param', {
        type: 'String',
        default: value,
      });
      Annotations.of(this).addInfo(`Using '${value}' value for ${name} state.`);
    } else {
      this.param = new CfnParameter(this, 'Param', {
        type: 'AWS::SSM::Parameter::Value<String>',
        default: name,
      });
      Annotations.of(this).addInfo(`Using Current value for ${name} state.`);
    }

    this.state = new StringParameter(this, 'State', {
      parameterName: name,
      stringValue: this.param.valueAsString,
    });

    this.name = name;
    this.value = this.state.stringValue;
    this.rawValue = value;
  }
}
