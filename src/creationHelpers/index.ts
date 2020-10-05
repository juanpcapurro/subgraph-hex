import { GlobalState } from '../../generated/schema'
import { GLOBAL_STATE_ID, BIGINT_ZERO } from '../constants'

export * from './events'

export function getOrCreateGlobalState(): GlobalState {
  let state = GlobalState.load(GLOBAL_STATE_ID)
  if (state == null) {
    state = new GlobalState(GLOBAL_STATE_ID)
    state.shareRateRaw = BIGINT_ZERO
  }
  return state as GlobalState
}
