import { Address, BigInt } from "@graphprotocol/graph-ts";
import { Token } from "../../generated/schema";
import { ERC20NameBytes as ERC20NameBytesABI } from "../../generated/LBPair/ERC20NameBytes";
import { ERC20SymbolBytes as ERC20SymbolBytesABI } from "../../generated/LBPair/ERC20SymbolBytes";
import { ERC20DecimalBytes as ERC20DecimalBytesABI } from "../../generated/LBPair/ERC20DecimalBytes";

export function loadToken(address: Address): Token {
  let token = Token.load(address.toHexString());

  if (!token) {
    token = new Token(address.toHexString());
    token.name = getName(address);
    token.symbol = getSymbol(address);
    token.decimals = getDecimals(address);

    token.save();
  }

  return token as Token;
}

function getSymbol(address: Address): string {
  const contract = ERC20SymbolBytesABI.bind(address);

  let tokenSymbol = "unknown";
  const symbolResultCall = contract.try_symbol();
  if (!symbolResultCall.reverted) {
    tokenSymbol = symbolResultCall.value.toString();
  }

  return tokenSymbol;
}

function getName(address: Address): string {
  const contract = ERC20NameBytesABI.bind(address);

  let tokenName = "unknown";
  const tokenNameCall = contract.try_name();
  if (!tokenNameCall.reverted) {
    tokenName = tokenNameCall.value.toString();
  }

  return tokenName;
}

function getDecimals(address: Address): BigInt {
  const contract = ERC20DecimalBytesABI.bind(address);

  let decimalsValue = BigInt.fromI32(18); // 18 as default
  const decimalsValueCall = contract.try_decimals();
  if (!decimalsValueCall.reverted) {
    decimalsValue = BigInt.fromI32(decimalsValueCall.value);
  }

  return decimalsValue;
}
