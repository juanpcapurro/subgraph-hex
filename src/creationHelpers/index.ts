import { BigInt, Address, log } from '@graphprotocol/graph-ts'
import { GlobalState, Stake } from '../../generated/schema'
import { Contract__stakeListsResult, Contract } from '../../generated/Contract/Contract'

export * from './events'

const GLOBAL_STATE_ID = 'global'
export function getOrCreateGlobalState(): GlobalState {
  let state = GlobalState.load(GLOBAL_STATE_ID)
  if (state == null) {
    state = new GlobalState(GLOBAL_STATE_ID)
    state.shareRateRaw = new BigInt(0)
  }
  return state as GlobalState
}

export function createStake(contractAddress: Address, stakerAddr: Address, stakeId: BigInt): Stake {
  const contract: Contract = Contract.bind(contractAddress)
  const stakeCount: BigInt = contract.stakeCount(stakerAddr)
  const stakeIndex = stakeCount - BigInt.fromI32(1)
  log.info('length of stakes for address {}: {}. getting index {}', [
    stakerAddr.toHexString(),
    stakeCount.toString(),
    stakeIndex.toString(),
  ])
  // TODO: if a user makes two stakes in the same block, this'll return the same one for both.
  // unless the indexer does some fancy thing where it asks the node for the state of the contract after a certain transaction, and not at a certain height.
  const stakeInfo: Contract__stakeListsResult = contract.stakeLists(stakerAddr, stakeIndex)
  const stake: Stake = new Stake(stakeId.toString())
  stake.stakeId = stakeId
  stake.stakerAddr = stakerAddr
  stake.stakedHeartsRaw = stakeInfo.value1
  stake.stakedSharesRaw = stakeInfo.value2
  stake.lockDay = BigInt.fromI32(stakeInfo.value3)
  stake.stakedDays = BigInt.fromI32(stakeInfo.value4)
  // stake.unlockDay will always be 0 when creating the stake, so we don't set it
  stake.isAutoStake = stakeInfo.value6
  return stake
}
