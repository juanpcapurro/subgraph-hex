import { StakeEnd as StakeEndEvent } from '../../generated/Contract/Contract'
import { StakeEnd } from '../../generated/schema'
import { BigInt, log, Bytes } from '@graphprotocol/graph-ts'

export function createStakeEnd(event: StakeEndEvent): StakeEnd {
  const stakeId: string = event.params.stakeId.toString()
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

  const stakeEnd = new StakeEnd(stakeId)
  stakeEnd.blockNumber = event.block.number

  stakeEnd.servedDays = BigInt.fromUnsignedBytes(servedDaysAsBytes)
  stakeEnd.stakedHeartsRaw = BigInt.fromUnsignedBytes(stakedHeartsAsBytes)
  stakeEnd.stakeSharesRaw = BigInt.fromUnsignedBytes(stakeSharesAsBytes)
  stakeEnd.payoutRaw = BigInt.fromUnsignedBytes(payoutAsBytes)
  stakeEnd.penaltyRaw = BigInt.fromUnsignedBytes(penaltyAsBytes)
  stakeEnd.prevUnlocked = prevUnlockedAsBytes.length != 0

  log.debug('stake: {} getting data0 from StakeEnd event: {} length: {}', [
    stakeId,
    data0.toHex(),
    BigInt.fromI32(data0.length).toString(),
  ])
  log.debug('stake: {} getting data1 from StakeEnd event: {} length: {}', [
    stakeId,
    data1.toHex(),
    BigInt.fromI32(data1.length).toString(),
  ])
  log.debug('stake: {} sliced bits for stakedHeartsRaw: {} length: {} stakedHeartsRaw: {}', [
    stakeId,
    stakedHeartsAsBytes.toHex(),
    BigInt.fromI32(stakedHeartsAsBytes.length).toString(),
    stakeEnd.stakedHeartsRaw.toString(),
  ])
  log.debug('stake: {} sliced bits for stakeSharesRaw: {} length: {} stakeSharesRaw: {}', [
    stakeId,
    stakeSharesAsBytes.toHex(),
    BigInt.fromI32(stakeSharesAsBytes.length).toString(),
    stakeEnd.stakeSharesRaw.toString(),
  ])
  log.debug('stake: {} sliced bits for payoutRaw: {} length: {} payoutRaw: {}', [
    stakeId,
    payoutAsBytes.toHex(),
    BigInt.fromI32(payoutAsBytes.length).toString(),
    stakeEnd.payoutRaw.toString(),
  ])
  log.debug('stake: {} sliced bits for penaltyRaw: {} length: {} penaltyRaw: {}', [
    stakeId,
    penaltyAsBytes.toHex(),
    BigInt.fromI32(penaltyAsBytes.length).toString(),
    stakeEnd.penaltyRaw.toString(),
  ])
  log.debug('stake: {} sliced bits for servedDays: {} length: {} servedDays: {}', [
    stakeId,
    servedDaysAsBytes.toHex(),
    BigInt.fromI32(servedDaysAsBytes.length).toString(),
    stakeEnd.servedDays.toString(),
  ])
  log.debug('stake: {} sliced bits for prevUnlocked: {} length: {} prevUnlocked: {}', [
    stakeId,
    prevUnlockedAsBytes.toHex(),
    BigInt.fromI32(prevUnlockedAsBytes.length).toString(),
    stakeEnd.prevUnlocked ? 'true' : 'false',
  ])
  return stakeEnd
}
