import { expect as expectCDK, haveResource, SynthUtils } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as route53 from '@aws-cdk/aws-route53';
import  = require('../lib/index');

test('Empty Stack', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'aws-cdk-elbv2-integ');
    // WHEN
 
    const zone = new route53.HostedZone(stack, 'HostedZone', {
      zoneName: 'myzone'
    });

    // WHEN
    new route53.RecordSet(stack, 'Basic', {
      zone,
      recordName: 'www',
      recordType: route53.RecordType.CNAME,
      target: route53.RecordTarget.fromValues('zzz')
    });

    // THEN
    //expect(() => expectCDK(stack).to(haveResource('AWS::Route53::RecordSet'))).not.toThrowError();
    app.synth();
});
