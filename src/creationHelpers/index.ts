import { BigInt } from '@graphprotocol/graph-ts'
import { GlobalState } from '../../generated/schema'

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
