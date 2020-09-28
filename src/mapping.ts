import { BigInt, ethereum, Address, log } from '@graphprotocol/graph-ts'
import { ShareRateChange as ShareRateChangeEvent, Contract, StakeStart } from '../generated/Contract/Contract'
import { GlobalState, ShareRateChange, Stake } from '../generated/schema'

//constants
const GLOBAL_STATE_ID = 'global'

//helpers
function getOrCreateGlobalState(): GlobalState {
  let state = GlobalState.load(GLOBAL_STATE_ID)
  if (state == null) {
    state = new GlobalState(GLOBAL_STATE_ID)
    state.shareRateRaw = new BigInt(0)
  }
  return state as GlobalState
}

function createStake(contractAddress: Address, stakerAddr: Address, stakeId: BigInt): Stake {
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
  const stakeInfo = contract.stakeLists(stakerAddr, stakeIndex)
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

function updateGlobalState(event: ethereum.Event): void {
  const state: GlobalState = getOrCreateGlobalState()
  const contract: Contract = Contract.bind(event.address)
  const globals: Array<BigInt> = contract.globalInfo()

  state.lockedHeartsTotalRaw = globals[0]
  state.nextStakeSharesTotalRaw = globals[1]
  state.shareRateRaw = globals[2]
  state.stakePenaltyTotalRaw = globals[3]
  state.dailyDataCountRaw = globals[4]
  state.stakeSharesTotalRaw = globals[5]
  state.latestStakeIdRaw = globals[6]
  state.unclaimedSatoshisTotalRaw = globals[7]
  state.claimedSatoshisTotalRaw = globals[8]
  state.claimedBtcAddrCountRaw = globals[9]
  // skip block timestamp
  state.totalSupplyRaw = globals[11]
  state.xfLobbyForCurrentDayRaw = globals[12]

  state.save()
}

export function handleShareRateChange(event: ShareRateChangeEvent): void {
  const oldShareRateRaw: BigInt = getOrCreateGlobalState().shareRateRaw
  updateGlobalState(event)
  const shareRateRaw: BigInt = getOrCreateGlobalState().shareRateRaw
  const stakeId: string = event.params.stakeId.toString()
  // TODO: check if there can be multiple ShareRateChange events for a single stakeId
  const shareRateChange: ShareRateChange = new ShareRateChange(stakeId)

  shareRateChange.stakeId = stakeId
  shareRateChange.oldShareRateRaw = oldShareRateRaw
  shareRateChange.newShareRateRaw = shareRateRaw
  shareRateChange.differenceRaw = shareRateRaw - oldShareRateRaw
  shareRateChange.blockNumber = event.block.number

  shareRateChange.save()
}

export function handleStakeStart(event: StakeStart): void {
  const stake: Stake = createStake(event.address, event.params.stakerAddr, event.params.stakeId)
  stake.save()
}
