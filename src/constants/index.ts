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
  "0x4Fa8f706Fb49F4cbd49e01D41A8554FE4100E667"
);

export const JOE_DEX_LENS_ADDRESS = Address.fromString(
  "0x3F523F9b98184e1EA6f182D13F5bC59C0F147f8D"
);

export const WAVAX_ADDRESS = Address.fromString(
  "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7"
);
