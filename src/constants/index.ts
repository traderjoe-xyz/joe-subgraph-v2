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

// TODO @gaepsuni: generate from mustache template via `yarn prepare:avax`
export const LBFACTORY_ADDRESS = Address.fromString(
  "0xC8Af41e49e2C03eA14706C7aa9cEE60454bc5c03"
);

export const JOE_DEX_LENS_ADDRESS = Address.fromString(
  "0x1Be66E6aC1A92f84F6D39E8ED3fc2E0AF8D05747"
);

export const WAVAX_ADDRESS = Address.fromString(
  "0xaE4EC9901c3076D0DdBe76A520F9E90a6227aCB7"
);
