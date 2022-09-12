import { Address } from "@graphprotocol/graph-ts";
import { User } from "../../generated/schema";

export function loadUser(address: Address): User {
  let user = User.load(address.toString());
  if (!user) {
    user = new User(address.toString());
    user.save();
  }

  return user as User
}