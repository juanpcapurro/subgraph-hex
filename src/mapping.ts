import { BigInt, ethereum, Address, log, Bytes } from '@graphprotocol/graph-ts'
import { ShareRateChange as ShareRateChangeEvent, StakeEnd, Contract, StakeStart } from '../generated/Contract/Contract'
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

export function handleStakeEnd(event: StakeEnd): void {
  const stakeId: string = event.params.stakeId.toString()
  const stake: Stake | null = Stake.load(stakeId)
  assert(
    stake != null,
    'received a stakeEnd event for a non-existing event: ' +
      stakeId +
      '. Most likely we failed to import the event in the first place',
  )
  const data0: Bytes = event.params.data0 as Bytes
  const data1: Bytes = event.params.data1 as Bytes
  // uint40            timestamp       -->  data0 [ 39: 0] 4 0
  // address  indexed  stakerAddr
  // uint40   indexed  stakeId
  // uint72            stakedHearts    -->  data0 [111: 40] 13 5
  // uint72            stakeShares     -->  data0 [183:112] 22 14
  // uint72            payout          -->  data0 [255:184] 31 23
  // uint72            penalty         -->  data1 [ 71:  0] 8 0
  // uint16            servedDays      -->  data1 [ 87: 72] 10 9
  // bool              prevUnlocked    -->  data1 [ 95: 88] 11 11

  const stakedHeartsAsBytes: Bytes = data0.subarray(5, 14) as Bytes
  const stakeSharesAsBytes: Bytes = data0.subarray(14, 23) as Bytes
  const payoutAsBytes: Bytes = data0.subarray(23, 32) as Bytes

  const penaltyAsBytes: Bytes = data1.subarray(0, 9) as Bytes
  const servedDaysAsBytes: Bytes = data1.subarray(9, 11) as Bytes
  const prevUnlockedAsBytes: Bytes = data1.subarray(11, 12) as Bytes

  const servedDays: BigInt = BigInt.fromUnsignedBytes(servedDaysAsBytes)
  const stakedHearts: BigInt = BigInt.fromUnsignedBytes(stakedHeartsAsBytes)
  const stakeShares: BigInt = BigInt.fromUnsignedBytes(stakeSharesAsBytes)
  const payout: BigInt = BigInt.fromUnsignedBytes(payoutAsBytes)
  const penalty: BigInt = BigInt.fromUnsignedBytes(penaltyAsBytes)
  const prevUnlocked = prevUnlockedAsBytes.length != 0

  log.error('stake: {} getting data0 from StakeEnd event: {} length: {}', [
    stakeId,
    data0.toHex(),
    BigInt.fromI32(data0.length).toString(),
  ])
  log.error('stake: {} getting data1 from StakeEnd event: {} length: {}', [
    stakeId,
    data1.toHex(),
    BigInt.fromI32(data1.length).toString(),
  ])
  log.error('stake: {} sliced bits for stakedHearts: {} length: {} stakedHearts: {}', [
    stakeId,
    stakedHeartsAsBytes.toHex(),
    BigInt.fromI32(stakedHeartsAsBytes.length).toString(),
    stakedHearts.toString(),
  ])
  log.error('stake: {} sliced bits for stakeShares: {} length: {} stakeShares: {}', [
    stakeId,
    stakeSharesAsBytes.toHex(),
    BigInt.fromI32(stakeSharesAsBytes.length).toString(),
    stakeShares.toString(),
  ])
  log.error('stake: {} sliced bits for payout: {} length: {} payout: {}', [
    stakeId,
    payoutAsBytes.toHex(),
    BigInt.fromI32(payoutAsBytes.length).toString(),
    payout.toString(),
  ])
  log.error('stake: {} sliced bits for penalty: {} length: {} penalty: {}', [
    stakeId,
    penaltyAsBytes.toHex(),
    BigInt.fromI32(penaltyAsBytes.length).toString(),
    penalty.toString(),
  ])
  log.error('stake: {} sliced bits for servedDays: {} length: {} servedDays: {}', [
    stakeId,
    servedDaysAsBytes.toHex(),
    BigInt.fromI32(servedDaysAsBytes.length).toString(),
    servedDays.toString(),
  ])
  log.error('stake: {} sliced bits for prevUnlocked: {} length: {} prevUnlocked: {}', [
    stakeId,
    prevUnlockedAsBytes.toHex(),
    BigInt.fromI32(prevUnlockedAsBytes.length).toString(),
    prevUnlocked.toString(),
  ])
  stake.unlockDay = stake.lockDay + servedDays
  stake.save()
}
