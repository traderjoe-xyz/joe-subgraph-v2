import { Address } from "@graphprotocol/graph-ts";
import { User } from "../../generated/schema";
import { BIG_INT_ONE } from "../constants";
import { loadLBFactory } from "./lbFactory";

export function loadUser(address: Address): User {
  const lbFactory = loadLBFactory();
  let user = User.load(address.toHexString());

  if (!user) {
    user = new User(address.toHexString());
    lbFactory.userCount = lbFactory.userCount.plus(BIG_INT_ONE);
  
    user.save();
    lbFactory.save()
  }

  return user as User
}