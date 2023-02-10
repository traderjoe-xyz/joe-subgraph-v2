import { BigInt, BigDecimal, Address } from "@graphprotocol/graph-ts";
import { Bin, LBPair, Token } from "../../generated/schema";
import { BIG_DECIMAL_ONE, BIG_DECIMAL_ZERO, BIG_INT_ZERO } from "../constants";
import { loadToken } from "../entities";
import { getPriceYOfBin } from "../utils";

export function loadBin(lbPair: LBPair, binId: BigInt): Bin {
  const id = lbPair.id.concat("#").concat(binId.toString());
  let bin = Bin.load(id);

  if (!bin) {
    const tokenX = loadToken(Address.fromString(lbPair.tokenX));
    const tokenY = loadToken(Address.fromString(lbPair.tokenY));

    bin = new Bin(id);
    bin.lbPair = lbPair.id;
    bin.binId = binId;
    bin.reserveX = BIG_DECIMAL_ZERO;
    bin.reserveY = BIG_DECIMAL_ZERO;
    bin.totalSupply = BIG_INT_ZERO;
    bin.priceY = getPriceYOfBin(binId, lbPair.binStep, tokenX, tokenY); // each bin has a determined price
    bin.priceX = BIG_DECIMAL_ONE.div(bin.priceY);
  }

  return bin;
}

export function trackBin(
  lbPair: LBPair,
  binId: BigInt,
  amountXIn: BigDecimal,
  amountXOut: BigDecimal,
  amountYIn: BigDecimal,
  amountYOut: BigDecimal,
  minted: BigInt,
  burned: BigInt
): Bin {
  const bin = loadBin(lbPair, binId);

  bin.totalSupply = bin.totalSupply.plus(minted).minus(burned);
  bin.reserveX = bin.reserveX.plus(amountXIn).minus(amountXOut);
  bin.reserveY = bin.reserveY.plus(amountYIn).minus(amountYOut);
  bin.save();

  return bin as Bin;
}
