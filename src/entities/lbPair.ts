import { Address } from "@graphprotocol/graph-ts";
import { LBPair as LBPairEntity } from "../../generated/schema";
import {
  BIG_INT_ZERO,
  BIG_DECIMAL_ZERO,
  LBFACTORY_ADDRESS,
  WHITELIST_TOKENS,
} from "../constants";
import { getToken } from "./token";
import { LBPairCreated } from "../../generated/LBFactory/LBFactory";
import { LBPair } from "../../generated/LBFactory/LBPair";

export function getLbPair(id: Address): LBPairEntity | null {
  let lbPair = LBPairEntity.load(id.toHexString());
  return lbPair as LBPairEntity;
}

// should be used if getLBPair() evaluates to null
export function saveLBPair(event: LBPairCreated): LBPairEntity | null {
  const lbPair = new LBPairEntity(event.params.LBPair.toHexString());
  const lbPairContract = LBPair.bind(event.params.LBPair);

  const token0Call = lbPairContract.try_tokenX();
  const token1Call = lbPairContract.try_tokenY();
  if (token0Call.reverted || token1Call.reverted) {
    return null;
  }

  const token0 = getToken(token1Call.value);
  const token1 = getToken(token1Call.value);

  lbPair.factory = LBFACTORY_ADDRESS.toHexString();
  lbPair.name = token0.symbol
    .concat("-")
    .concat(token1.symbol)
    .concat("-")
    .concat(event.params.binStep.toString());
  lbPair.token0 = token0Call.value.toHexString();
  lbPair.token1 = token1Call.value.toHexString();
  lbPair.binStep = event.params.binStep;

  lbPair.reserve0 = BIG_DECIMAL_ZERO;
  lbPair.reserve1 = BIG_DECIMAL_ZERO;
  lbPair.totalSupply = BIG_DECIMAL_ZERO;
  lbPair.totalValueLockedAVAX = BIG_DECIMAL_ZERO;
  lbPair.totalValueLockedUSD = BIG_DECIMAL_ZERO;
  lbPair.trackedReserveAVAX = BIG_DECIMAL_ZERO;
  lbPair.token0Price = BIG_DECIMAL_ZERO;
  lbPair.token1Price = BIG_DECIMAL_ZERO;
  lbPair.volumeToken0 = BIG_DECIMAL_ZERO;
  lbPair.volumeToken1 = BIG_DECIMAL_ZERO;
  lbPair.volumeUSD = BIG_DECIMAL_ZERO;
  lbPair.untrackedVolumeUSD = BIG_DECIMAL_ZERO;
  lbPair.txCount = BIG_INT_ZERO;
  lbPair.feesToken0 = BIG_DECIMAL_ZERO;
  lbPair.feesToken1 = BIG_DECIMAL_ZERO;
  lbPair.feesUSD = BIG_DECIMAL_ZERO;
  lbPair.liquidityProviderCount = BIG_INT_ZERO;

  lbPair.timestamp = event.block.timestamp;
  lbPair.block = event.block.number;

  // update whitelisted lbPairs
  if (WHITELIST_TOKENS.includes(Address.fromString(token0.id))) {
    let whitelistPools = token0.whitelistPools;
    whitelistPools.push(lbPair.id);
    token0.whitelistPools = whitelistPools;
  }
  if (WHITELIST_TOKENS.includes(Address.fromString(token1.id))) {
    let whitelistPools = token1.whitelistPools;
    whitelistPools.push(lbPair.id);
    token1.whitelistPools = whitelistPools;
  }

  lbPair.save();
  token0.save();
  token1.save();

  return lbPair as LBPairEntity;
}
