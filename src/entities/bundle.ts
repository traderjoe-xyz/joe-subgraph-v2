import { Bundle } from "../../generated/schema";
import { getAvaxPriceInUSD } from "../utils";

export function loadBundle(): Bundle {
  let bundle = Bundle.load("1");

  if (bundle === null) {
    bundle = new Bundle("1");
    bundle.avaxPriceUSD = getAvaxPriceInUSD();
    bundle.save();
  }

  return bundle as Bundle;
}
