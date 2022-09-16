import { Address } from "@graphprotocol/graph-ts";
import { LBPair } from "../../generated/schema";
import {
  BIG_INT_ZERO,
  BIG_DECIMAL_ZERO,
  LBFACTORY_ADDRESS,
  WHITELIST_TOKENS,
} from "../constants";
import { loadToken } from "./token";
import { LBPairCreated } from "../../generated/LBFactory/LBFactory";
import { LBPair as LBPairABI } from "../../generated/LBFactory/LBPair";

export function loadLbPair(id: Address): LBPair | null {
  let lbPair = LBPair.load(id.toHexString());
  return lbPair as LBPair;
}

// should be used if loadLBPair() evaluates to null
export function createLBPair(event: LBPairCreated): LBPair | null {
  const lbPair = new LBPair(event.params.LBPair.toHexString());
  const lbPairContract = LBPairABI.bind(event.params.LBPair);

  const tokenXCall = lbPairContract.try_tokenX();
  const tokenYCall = lbPairContract.try_tokenY();
  if (tokenXCall.reverted || tokenYCall.reverted) {
    return null;
  }

  const tokenX = loadToken(tokenYCall.value);
  const tokenY = loadToken(tokenYCall.value);

  lbPair.factory = LBFACTORY_ADDRESS.toHexString();
  lbPair.name = tokenX.symbol
    .concat("-")
    .concat(tokenY.symbol)
    .concat("-")
    .concat(event.params.binStep.toString());
  lbPair.tokenX = tokenXCall.value.toHexString();
  lbPair.tokenY = tokenYCall.value.toHexString();
  lbPair.binStep = event.params.binStep;

  lbPair.reserveX = BIG_DECIMAL_ZERO;
  lbPair.reserveY = BIG_DECIMAL_ZERO;
  lbPair.totalSupply = BIG_DECIMAL_ZERO;
  lbPair.totalValueLockedAVAX = BIG_DECIMAL_ZERO;
  lbPair.totalValueLockedUSD = BIG_DECIMAL_ZERO;
  lbPair.trackedReserveAVAX = BIG_DECIMAL_ZERO;
  lbPair.tokenXPrice = BIG_DECIMAL_ZERO;
  lbPair.tokenYPrice = BIG_DECIMAL_ZERO;
  lbPair.volumeTokenX = BIG_DECIMAL_ZERO;
  lbPair.volumeTokenY = BIG_DECIMAL_ZERO;
  lbPair.volumeUSD = BIG_DECIMAL_ZERO;
  lbPair.untrackedVolumeUSD = BIG_DECIMAL_ZERO;
  lbPair.txCount = BIG_INT_ZERO;
  lbPair.feesTokenX = BIG_DECIMAL_ZERO;
  lbPair.feesTokenY = BIG_DECIMAL_ZERO;
  lbPair.feesUSD = BIG_DECIMAL_ZERO;
  lbPair.liquidityProviderCount = BIG_INT_ZERO;

  lbPair.timestamp = event.block.timestamp;
  lbPair.block = event.block.number;

  // update whitelisted lbPairs
  if (WHITELIST_TOKENS.includes(Address.fromString(tokenX.id))) {
    let whitelistPools = tokenX.whitelistPools;
    whitelistPools.push(lbPair.id);
    tokenX.whitelistPools = whitelistPools;
  }
  if (WHITELIST_TOKENS.includes(Address.fromString(tokenY.id))) {
    let whitelistPools = tokenY.whitelistPools;
    whitelistPools.push(lbPair.id);
    tokenY.whitelistPools = whitelistPools;
  }

  lbPair.save();
  tokenX.save();
  tokenY.save();

  return lbPair as LBPair;
}
