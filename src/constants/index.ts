import { Address, BigInt, BigDecimal } from "@graphprotocol/graph-ts";

export const ADDRESS_ZERO = Address.fromString(
  "0x0000000000000000000000000000000000000000"
);

export const BIG_DECIMAL_1E6 = BigDecimal.fromString('1e6')
export const BIG_DECIMAL_1E12 = BigDecimal.fromString('1e12')
export const BIG_DECIMAL_1E18 = BigDecimal.fromString('1e18')
export const BIG_DECIMAL_ZERO = BigDecimal.fromString("0");
export const BIG_DECIMAL_ONE = BigDecimal.fromString("1");

export const BIG_INT_ONE = BigInt.fromI32(1);
export const BIG_INT_ZERO = BigInt.fromI32(0);
export const NULL_CALL_RESULT_VALUE =
  "0x0000000000000000000000000000000000000000000000000000000000000001";

// -> FUJI
export const AVAX_USDC_V1 = Address.fromString("0x9371619C8E2A487D57FB9F8E36Bcb0317Bff0529") 

export const AVAX_USDC_20BPS = Address.fromString(
  "0xc8aa3bF8623C35EAc518Ea82B55C2aa46D5A02f6"
);

export const LBFACTORY_ADDRESS = Address.fromString(
  "0x2950b9bd19152C91d69227364747b3e6EFC8Ab7F"
);

export const WAVAX_ADDRESS = Address.fromString(
  "0xd00ae08403B9bbb9124bB305C09058E32C39A48c"
);

export const WHITELIST_TOKENS: Address[] = [
  WAVAX_ADDRESS, // WAVAX
  Address.fromString("0xB6076C93701D6a07266c31066B298AeC6dd65c2d"), // USDC
  Address.fromString("0xAb231A5744C8E6c45481754928cCfFFFD4aa0732"), // USDT
  // USDC_E
  // MIM
  // USDT_E
  // DAI
  // WETH
  // WBTC
];

export const STABLECOINS: Address[] = [
  Address.fromString("0xB6076C93701D6a07266c31066B298AeC6dd65c2d"), // USDC
  Address.fromString("0xAb231A5744C8E6c45481754928cCfFFFD4aa0732"), // USDT
];

// -> AVALANCHE
// export const AVAX_USDC_20BPS = Address.fromString(
//   "0x0000000000000000000000000000000000000000"
// );

// export const LBFACTORY_ADDRESS: Address = Address.fromString(
//   "0x0000000000000000000000000000000000000000"
// );

// export const WAVAX_ADDRESS = Address.fromString(
//   "0x0000000000000000000000000000000000000000"
// );

// export const WHITELIST_TOKENS: Address[] = [
//   Address.fromString("0x0000000000000000000000000000000000000000"), // WAVAX
//   Address.fromString("0x0000000000000000000000000000000000000000"), // USDC
//   Address.fromString("0x0000000000000000000000000000000000000000"), // USDC_E
//   Address.fromString("0x0000000000000000000000000000000000000000"), // MIM
//   Address.fromString("0x0000000000000000000000000000000000000000"), // USDT
//   Address.fromString("0x0000000000000000000000000000000000000000"), // USDT_E
//   Address.fromString("0x0000000000000000000000000000000000000000"), // DAI
//   Address.fromString("0x0000000000000000000000000000000000000000"), // WETH
//   Address.fromString("0x0000000000000000000000000000000000000000"), // WBTC
// ];

// export const STABLECOINS: Address[] = [
//   Address.fromString("0x0000000000000000000000000000000000000000"), // USDC
//   Address.fromString("0x0000000000000000000000000000000000000000"), // USDT
// ];
