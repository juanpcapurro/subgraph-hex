import { BigInt, ethereum, log, Bytes } from '@graphprotocol/graph-ts'
import {
  ShareRateChange as ShareRateChangeEvent,
  StakeEnd as StakeEndEvent,
  Contract,
  StakeStart,
} from '../generated/Contract/Contract'
import { GlobalState, ShareRateChange, Stake, StakeEnd } from '../generated/schema'
import { createStake, getOrCreateGlobalState, createStakeEnd } from './creationHelpers'

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

export function handleStakeEnd(event: StakeEndEvent): void {
  const stakeId: string = event.params.stakeId.toString()
  const stake: Stake | null = Stake.load(stakeId)
  assert(
    stake != null,
    'received a stakeEnd event for a non-existing event: ' +
      stakeId +
      '. Most likely we failed to import the event in the first place',
  )
  const stakeEnd: StakeEnd = createStakeEnd(event)
  stakeEnd.save()
  stake.unlockDay = stake.lockDay + stakeEnd.servedDays
  stake.save()
}
