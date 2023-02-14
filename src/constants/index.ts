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

export const LBFACTORY_ADDRESS = Address.fromString(
  "0x6B8E020098cd1B3Ec9f811024bc24e51C660F768"
);

export const JOE_DEX_LENS_ADDRESS = Address.fromString(
  "0x8b9e4f329f013320670459bcab01c2b8dc9c32c3"
);

export const JOE_DEX_LENS_USD_DECIMALS = BigDecimal.fromString("1e18");

export const WAVAX_ADDRESS = Address.fromString(
  "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c"
);

export const VAULT_FACTORY_ADDRESS = Address.fromString(
  "0xECe167a8623D5ab7f8568842d0fC7dAa422467d6"
);
