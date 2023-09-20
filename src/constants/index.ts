import { Address, BigInt, BigDecimal } from "@graphprotocol/graph-ts";

export const ADDRESS_ZERO = Address.fromString(
  "0x0000000000000000000000000000000000000000"
);

export const BIG_DECIMAL_1E6 = BigDecimal.fromString("1e6");
export const BIG_DECIMAL_1E10 = BigDecimal.fromString("1e10");
export const BIG_DECIMAL_1E12 = BigDecimal.fromString("1e12");
export const BIG_DECIMAL_1E18 = BigDecimal.fromString("1e18");
export const BIG_DECIMAL_ZERO = BigDecimal.fromString("0");
export const BIG_DECIMAL_ONE = BigDecimal.fromString("1");
export const BIG_DECIMAL_HUNDRED = BigDecimal.fromString("100");

export const BIG_INT_ONE = BigInt.fromI32(1);
export const BIG_INT_ZERO = BigInt.fromI32(0);
export const NULL_CALL_RESULT_VALUE =
  "0x0000000000000000000000000000000000000000000000000000000000000001";

export const LBFACTORY_ADDRESS = Address.fromString('0xDC8d77b69155c7E68A95a4fb0f06a71FF90B943a');

export const JOE_DEX_LENS_ADDRESS = Address.fromString('0x3008D2C0A3b7C676ff8bd948fdE9B5fC6a26A56f');

export const JOE_DEX_LENS_USD_DECIMALS = BigDecimal.fromString("1e6");

export const WAVAX_ADDRESS = Address.fromString('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2');
