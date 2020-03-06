import { Cosmos } from '../src/interfaces';
import { RESOLVE } from '../src/pattern';

test('Resolve Pattern', () => {
  const scope = {
    Type: 'Cosmos',
    Name: 'Demo',
  } as Cosmos;

  // Normal case
  expect(RESOLVE('${Partition}-${Cosmos}-${Type}', scope, scope.Type)).toEqual('Core-Demo-Cosmos');

  // Test with no type passed
  expect(RESOLVE('${Partition}-${Cosmos}-${Type}', scope)).toEqual('Core-Demo');
});

test('Resolve Pattern when missing params', () => {
  const scope = {
    Type: 'Cosmos',
    Name: 'Demo',
  } as Cosmos;

  // Normal case
  expect(() => RESOLVE('${Partition}-${Cosmos}-${missing}-${Type}', scope, scope.Type)).toThrowError(
    'missing is not defined'
  );
});
