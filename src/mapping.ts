import { BigInt, ethereum } from '@graphprotocol/graph-ts'
import {
  ShareRateChange as ShareRateChangeEvent,
  StakeEnd as StakeEndEvent,
  StakeStart as StakeStartEvent,
  HEXContract,
} from '../generated/HEXContract/HEXContract'
import { GlobalState, ShareRateChange, Stake, StakeEnd, StakeStart } from '../generated/schema'
import { createStakeStart, getOrCreateGlobalState, createStakeEnd } from './creationHelpers'

// there's no way to retrieve it from the contract, but it's hardcoded and the contract isn't upgradeable
const LAUNCH_TIME = BigInt.fromI32(1575331200)
const SECONDS_PER_DAY = BigInt.fromI32(60 * 60 * 24)

function getCurrentDay(timestamp: BigInt): BigInt {
  return (timestamp - LAUNCH_TIME) / SECONDS_PER_DAY
}

function updateGlobalState(event: ethereum.Event): void {
  const state: GlobalState = getOrCreateGlobalState()
  const contract: HEXContract = HEXContract.bind(event.address)
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

  shareRateChange.stake = stakeId
  shareRateChange.oldShareRateRaw = oldShareRateRaw
  shareRateChange.newShareRateRaw = shareRateRaw
  shareRateChange.differenceRaw = shareRateRaw - oldShareRateRaw
  shareRateChange.blockNumber = event.block.number
  shareRateChange.dayNumber = getCurrentDay(event.block.timestamp)

  shareRateChange.save()
}

export function handleStakeStart(event: StakeStartEvent): void {
  const stakeStart: StakeStart = createStakeStart(event)
  const stake: Stake = new Stake(stakeStart.id)
  stake.stakerAddr = stakeStart.stakerAddr
  stake.lockDay = getCurrentDay(event.block.timestamp)
  stake.stakedHeartsRaw = stakeStart.stakedHeartsRaw
  stake.stakeSharesRaw = stakeStart.stakeSharesRaw
  stake.stakedDays = stakeStart.stakedDays
  stake.isAutoStake = stakeStart.isAutoStake
  stakeStart.save()
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
  stake.servedDays = stakeEnd.servedDays
  stake.hadGoodAccounting = stakeEnd.prevUnlocked
  stake.penaltyRaw = stakeEnd.penaltyRaw
  stake.payoutRaw = stakeEnd.payoutRaw
  stake.save()
}
