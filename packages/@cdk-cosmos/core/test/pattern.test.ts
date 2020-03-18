import { RESOLVE } from '../src/';

test('Resolve Pattern', () => {
  const scope = { Partition: 'Core', Name: 'Demo' };

  // Normal case
  expect(RESOLVE('${Partition}-${Cosmos}-${Type}', 'Cosmos', scope)).toEqual('Core-Demo-Cosmos');

  // Test with no type passed
  expect(RESOLVE('${Partition}-${Cosmos}-${Type}', '', scope)).toEqual('Core-Demo');
});

test('Resolve Pattern when missing params', () => {
  const scope = { Partition: 'Core', Name: 'Demo' };

  // Normal case
  expect(() => RESOLVE('${Partition}-${Cosmos}-${missing}-${Type}', 'Type', scope)).toThrowError(
    'missing is not defined'
  );
});
