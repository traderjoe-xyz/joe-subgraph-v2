import { ethereum } from "@graphprotocol/graph-ts";
import { Transaction } from "../../generated/schema";

export function loadTransaction(event: ethereum.Event): Transaction {
  let transaction = Transaction.load(event.transaction.hash.toHexString());

  if (!transaction) {
    transaction = new Transaction(event.transaction.hash.toHexString());
    transaction.blockNumber = event.block.number.toI32();
    transaction.timestamp = event.block.timestamp.toI32();

    transaction.save();
  }

  return transaction as Transaction;
}
