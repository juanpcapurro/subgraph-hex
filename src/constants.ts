import { BigInt } from '@graphprotocol/graph-ts'
// domain constants

// there's no way to retrieve it from the contract, but it's hardcoded and the contract isn't upgradeable
export const LAUNCH_TIME = BigInt.fromI32(1575331200)
export const SECONDS_PER_DAY = BigInt.fromI32(60 * 60 * 24)
export const GLOBAL_STATE_ID = 'global'
export const BIGINT_ZERO = BigInt.fromI32(0)
