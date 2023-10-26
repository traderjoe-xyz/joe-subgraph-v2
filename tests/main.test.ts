import { Bytes } from '@graphprotocol/graph-ts';
import { assert, describe, test } from 'matchstick-as/assembly/index';
import { decodeAmounts, isSwapForY } from '../src/utils';

describe('Joe-Subgraph-V21', () => {
    describe(`function "isSwapForY`, () => {
        test(`should return true`, () => {
            const amountsIn = Bytes.fromHexString('0x00000000000000000000000000000000000000000000000678444A06CEB5A3DB');
            const ret = isSwapForY(amountsIn);
            assert.assertTrue(ret);
        });
        test(`should return false`, () => {
            const amountsIn = Bytes.fromHexString('0x000000000000000000DBEDB9B89AD36B00000000000000000000000000000000');
            const ret = isSwapForY(amountsIn);
            assert.assertTrue(!ret);
        });
    });

    describe(`function "decodeAmounts"`, () => {
        test(`should decode successfully, amount y is zero`, () => {
            const amounts = decodeAmounts(Bytes.fromHexString('0x00000000000000000000000000000000000000000000000678444A06CEB5A3DB'));
            assert.stringEquals('119346597418323256283', amounts[0].toString());
            assert.stringEquals('0', amounts[1].toString());
        });
        test(`should decode successfully, amount x is zero`, () => {
            const amounts = decodeAmounts(Bytes.fromHexString('0x000000000000000000DBEDB9B89AD36B00000000000000000000000000000000'));
            assert.stringEquals('0', amounts[0].toString());
            assert.stringEquals('61904401821520747', amounts[1].toString());
        });
    });
});
