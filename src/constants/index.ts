import { Address, BigInt, BigDecimal } from "@graphprotocol/graph-ts";

export const ADDRESS_ZERO = Address.fromString(
  "0x0000000000000000000000000000000000000000"
);

export const AVAX_USDC_20BPS = Address.fromString( // fuji
  "0xe59fe5a8856D53cBe3963fDBc6B8ce815c9870C0"
);
// export const AVAX_USDC_20BPS = Address.fromString( // mainnet
//   "0xe59fe5a8856D53cBe3963fDBc6B8ce815c9870C0"
// );

export const LBFACTORY_ADDRESS = Address.fromString( // fuji
  "0xF4Aa1047dEebB0D01933B7124c67393aF66D2Bd2"
);
// export const LBFACTORY_ADDRESS: Address = Address.fromString( // mainnet
//   "0x0000000000000000000000000000000000000000"
// );

export const WAVAX_ADDRESS = Address.fromString( // fuji
  "0xd00ae08403B9bbb9124bB305C09058E32C39A48c"
);
// export const WAVAX_ADDRESS = Address.fromString( // mainnet
//   "0x0000000000000000000000000000000000000000"
// );

export const WHITELIST_TOKENS: Address[] = [ // fuji
  WAVAX_ADDRESS, // WAVAX
  // USDC
  // USDC_E
  // MIM
  // USDT
  // USDT_E
  // DAI
  // WETH
  // WBTC
];
// export const WHITELIST_TOKENS: Address[] = [ // mainnet
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

export const STABLECOINS: Address[] = [ // fuji
  Address.fromString("0xe03bF9AD3e347bb311A9620Ee424c50E0b947385"), // USDC
  Address.fromString("0x8FFf749D5356E5F564fe3e37884df413A4a8cDE1"), // USDT
];
// export const STABLECOINS: Address[] = [ // mainnet
//   Address.fromString("0x0000000000000000000000000000000000000000"), // USDC
//   Address.fromString("0x0000000000000000000000000000000000000000"), // USDT
// ];

export const BIG_DECIMAL_ZERO = BigDecimal.fromString("0");
export const BIG_DECIMAL_ONE = BigDecimal.fromString("1");
export const BIG_INT_ONE = BigInt.fromI32(1);
export const BIG_INT_ZERO = BigInt.fromI32(0);

export const NULL_CALL_RESULT_VALUE =
  "0x0000000000000000000000000000000000000000000000000000000000000001";
