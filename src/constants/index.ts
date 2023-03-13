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

export const LBFACTORY_ADDRESS = Address.fromString("0x1886D09C9Ade0c5DB822D85D21678Db67B6c2982");

export const JOE_DEX_LENS_ADDRESS = Address.fromString(
  "0xf450749aeA1c5feF27Ae0237C56FecC43f6bE244"
);

export const JOE_DEX_LENS_USD_DECIMALS = BigDecimal.fromString(
  "1e6"
);

export const WAVAX_ADDRESS = Address.fromString("0x82aF49447D8a07e3bd95BD0d56f35241523fBab1");

export const VAULT_FACTORY_ADDRESS = Address.fromString(
  "0xBAF3af45a51b89667066917350F504ae9B8d8Ad5"
);
