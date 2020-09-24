import { BigInt, ethereum } from "@graphprotocol/graph-ts"
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

function updateGlobalState(event: ethereum.Event): void {
  let state: GlobalState = getOrCreateGlobalState();
  let contract :Contract = Contract.bind(event.address);
  let globals: Array<BigInt> =  contract.globalInfo();

  state.lockedHeartsTotalRaw       = globals[0];
  state.nextStakeSharesTotalRaw    = globals[1];
  state.shareRateRaw               = globals[2];
  state.stakePenaltyTotalRaw       = globals[3];
  state.dailyDataCountRaw          = globals[4];
  state.stakeSharesTotalRaw        = globals[5];
  state.latestStakeIdRaw           = globals[6];
  state.unclaimedSatoshisTotalRaw = globals[7];
  state.claimedSatoshisTotalRaw   = globals[8];
  state.claimedBtcAddrCountRaw    = globals[9];
  // skip block timestamp
  state.totalSupplyRaw             = globals[11];
  state.xfLobbyForCurrentDayRaw    = globals[12];

  state.save();
}

export function handleShareRateChange(event: ShareRateChangeEvent): void {
  let oldShareRateRaw: BigInt = getOrCreateGlobalState().shareRateRaw;
  updateGlobalState(event);
  let shareRateRaw: BigInt = getOrCreateGlobalState().shareRateRaw;
  let stakeId : String = event.params.stakeId.toString();
  // TODO: check if there can be multiple ShareRateChange events for a single stakeId
  let shareRateChange: ShareRateChange = new ShareRateChange(stakeId);

  shareRateChange.stakeId = stakeId;
  shareRateChange.oldShareRateRaw = oldShareRateRaw;
  shareRateChange.newShareRateRaw = shareRateRaw;
  shareRateChange.differenceRaw = shareRateRaw - oldShareRateRaw;
  shareRateChange.blockNumber = event.block.number;

  shareRateChange.save();
}
