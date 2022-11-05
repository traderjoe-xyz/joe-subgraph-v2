import { BigInt, BigDecimal } from "@graphprotocol/graph-ts";
import { Bin, LBPair, Token } from "../../generated/schema";
import { BIG_DECIMAL_ONE, BIG_DECIMAL_ZERO, BIG_INT_ZERO } from "../constants";
import { getPriceYOfBin } from "../utils";

export function trackBin(
  lbPair: LBPair,
  binId: BigInt,
  tokenX: Token,
  tokenY: Token,
  amountXIn: BigDecimal,
  amountXOut: BigDecimal,
  amountYIn: BigDecimal,
  amountYOut: BigDecimal,
  minted: BigInt,
  burned: BigInt
): Bin {
  const id = lbPair.id.concat("#").concat(binId.toString());
  let bin = Bin.load(id);

  if (!bin) {
    bin = new Bin(id);
    bin.lbPair = lbPair.id;
    bin.binId = binId;
    bin.reserveX = BIG_DECIMAL_ZERO;
    bin.reserveY = BIG_DECIMAL_ZERO;
    bin.totalSupply = BIG_INT_ZERO;
    bin.priceY = getPriceYOfBin(binId, lbPair.binStep, tokenX, tokenY); // each bin has a determined price
    bin.priceX = BIG_DECIMAL_ONE.div(bin.priceY);
  }

  bin.totalSupply = bin.totalSupply.plus(minted).minus(burned);
  bin.reserveX = bin.reserveX.plus(amountXIn).minus(amountXOut);
  bin.reserveY = bin.reserveY.plus(amountYIn).minus(amountYOut);
  bin.save();

  return bin as Bin;
}
