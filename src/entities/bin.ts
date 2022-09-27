import { BigInt, Address, bigDecimal } from "@graphprotocol/graph-ts";
import { Bin, LBPair } from "../../generated/schema";
import { LBPair as LBPairABI } from "../../generated/LBPair/LBPair";
import { BIG_DECIMAL_ZERO } from "../constants";
import { formatTokenAmountByDecimals, safeDiv } from "../utils";
import { loadToken } from "./token";

export function trackBin(lbPair: LBPair, binId: BigInt): Bin {
  const id = lbPair.id.concat("#").concat(binId.toString());
  let bin = Bin.load(id);
  const contract = LBPairABI.bind(Address.fromString(lbPair.id));
  const binReservesCall = contract.try_getBin(binId.toI32());
  const binTotalSupplyCall = contract.try_totalSupply(binId);

  const tokenX = loadToken(Address.fromString(lbPair.tokenX));
  const tokenY = loadToken(Address.fromString(lbPair.tokenY));

  if (!bin) {
    bin = new Bin(id);
    bin.lbPair = lbPair.id;
    bin.binId = binId;
  }

  if (!binReservesCall.reverted) {
    bin.reserveX = formatTokenAmountByDecimals(
      binReservesCall.value.value0,
      tokenX.decimals
    );
    bin.reserveY = formatTokenAmountByDecimals(
      binReservesCall.value.value1,
      tokenY.decimals
    );
    bin.price = safeDiv(bin.reserveX, bin.reserveY);
  } else {
    bin.reserveX = BIG_DECIMAL_ZERO;
    bin.reserveY = BIG_DECIMAL_ZERO;
    bin.price = BIG_DECIMAL_ZERO;
  }

  if (!binTotalSupplyCall.reverted) {
    bin.totalSupply = formatTokenAmountByDecimals(
      binTotalSupplyCall.value,
      BigInt.fromI32(18)
    );
  } else {
    bin.totalSupply = BIG_DECIMAL_ZERO;
  }

  bin.save();

  return bin as Bin;
}
