import { BigInt } from "@graphprotocol/graph-ts"
import {
  ShareRateChange as ShareRateChangeEvent,
} from "../generated/Contract/Contract"
import { GlobalState, ShareRateChange } from "../generated/schema"

//constants
const GLOBAL_STATE_ID = "global"

//helpers
function getOrCreateGlobalState(): GlobalState {
  let state = GlobalState.load(GLOBAL_STATE_ID);
  if(state == null) {
    state = new GlobalState(GLOBAL_STATE_ID)
  }
  return state as GlobalState
}

export function handleShareRateChange(event: ShareRateChangeEvent): void {
  let state: GlobalState = getOrCreateGlobalState();
  // get rid of manually-packed block timestamp
  let shareRateRaw: String  = event.params.data0.toHex();

  state.shareRateRaw = shareRateRaw;
  state.save()
}
