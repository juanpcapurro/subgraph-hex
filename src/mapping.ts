import { BigInt } from "@graphprotocol/graph-ts"
import {
  ShareRateChange as ShareRateChangeEvent,
  Contract
} from "../generated/Contract/Contract"
import { GlobalState, ShareRateChange } from "../generated/schema"

//constants
const GLOBAL_STATE_ID = "global"

//helpers
function getOrCreateGlobalState(): GlobalState {
  let state = GlobalState.load(GLOBAL_STATE_ID);
  if(state == null) {
    state = new GlobalState(GLOBAL_STATE_ID)
    state.shareRateRaw = new BigInt(0);
  }
  return state as GlobalState
}

export function handleShareRateChange(event: ShareRateChangeEvent): void {
  let state: GlobalState = getOrCreateGlobalState();
  let contract :Contract = Contract.bind(event.address);
  // get rid of manually-packed block timestamp
  let globals: Array<BigInt>  = contract.globalInfo();
  let shareRateRaw: BigInt = globals[2];

  let stakeId : String = event.params.stakeId.toString();
  // TODO: check if there can be multiple ShareRateChange events for a single stakeId
  let shareRateChange: ShareRateChange = new ShareRateChange(stakeId);
  shareRateChange.stakeId = stakeId;
  shareRateChange.oldShareRateRaw = state.shareRateRaw;
  shareRateChange.newShareRateRaw = shareRateRaw;
  state.shareRateRaw = shareRateRaw;
  shareRateChange.save();
  state.save();
}
