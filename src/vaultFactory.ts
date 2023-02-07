import {
  StrategyCreated,
  VaultCreated,
} from "../generated/VaultFactory/VaultFactory";
import { BIG_INT_ONE } from "./constants";
import { createVault } from "./entities/vault";
import { loadVaultFactory } from "./entities/vaultFactory";
import { createVaultStrategy } from "./entities/vaultStrategy";

export function handleVaultCreated(event: VaultCreated): void {
  const vault = createVault(event.params.vault);

  if (!vault) {
    return;
  }

  const factory = loadVaultFactory();
  factory.vaultCount = factory.vaultCount.plus(BIG_INT_ONE);
  factory.save();
}

export function handleStrategyCreated(event: StrategyCreated): void {
  const strategy = createVaultStrategy(event.params.strategy);

  if (!strategy) {
    return;
  }

  const factory = loadVaultFactory();
  factory.strategyCount = factory.strategyCount.plus(BIG_INT_ONE);
  factory.save();
}
