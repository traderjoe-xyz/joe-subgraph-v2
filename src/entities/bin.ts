import { BigInt, Address } from "@graphprotocol/graph-ts";
import { Bin, LBPair, Token } from "../../generated/schema";
import { LBPair as LBPairABI } from "../../generated/LBPair/LBPair";
import { BIG_DECIMAL_ONE, BIG_DECIMAL_ZERO } from "../constants";
import { formatTokenAmountByDecimals, getPriceYOfBin } from "../utils";

export function trackBin(lbPair: LBPair, binId: BigInt, tokenX: Token, tokenY: Token): Bin {
  const id = lbPair.id.concat("#").concat(binId.toString());
  let bin = Bin.load(id);

  if (!bin) {
    bin = new Bin(id);
    bin.lbPair = lbPair.id;
    bin.binId = binId;
    bin.reserveX = BIG_DECIMAL_ZERO;
    bin.reserveY = BIG_DECIMAL_ZERO;
    bin.totalSupply = BIG_DECIMAL_ZERO;
    bin.priceY = getPriceYOfBin(binId, lbPair.binStep, tokenX, tokenY ); // each bin has a determined price
    bin.priceX = BIG_DECIMAL_ONE.div(bin.priceY)
  }

  const contract = LBPairABI.bind(Address.fromString(lbPair.id));
  const binReservesCall = contract.try_getBin(binId.toI32());
  const binTotalSupplyCall = contract.try_totalSupply(binId);

  if (!binReservesCall.reverted) {
    bin.reserveX = formatTokenAmountByDecimals(
      binReservesCall.value.value0,
      tokenX.decimals
    );
    bin.reserveY = formatTokenAmountByDecimals(
      binReservesCall.value.value1,
      tokenY.decimals
    );
  } 

  if (!binTotalSupplyCall.reverted) {
    bin.totalSupply = formatTokenAmountByDecimals(
      binTotalSupplyCall.value,
      tokenY.decimals // bin's totalSupply is in terms of tokenY
    );
  } 

  bin.save();

  return bin as Bin;
}
