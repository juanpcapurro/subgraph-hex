import { BigInt } from '@graphprotocol/graph-ts'
import { LAUNCH_TIME, SECONDS_PER_DAY } from './constants'

export function getCurrentDay(timestamp: BigInt): BigInt {
  return (timestamp - LAUNCH_TIME) / SECONDS_PER_DAY
}
