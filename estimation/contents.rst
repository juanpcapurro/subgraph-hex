#######################
HEX subgraph estimation
#######################

Overview
========

.. uml::
    @startuml
    class User {
        address
    }

    class Stake {
        shares
        hearts
    }
    class LobbyEntry {
        amount
    }
    class BitcoinClaim {
    }

    class ShareRateChange {
        old
        new
    }
    class Claim {
    }
    class ClaimAssist {
    }
    class StakeEnd {
        penalty
        payout
    }
    class StakeGoodAccounting {
        penalty
        payout
    }
    class StakeStart {
    }
    class XfLobbyEnter {
    }
    class XfLobbyExit {
    }

    User "1" --> "*" Stake
    User "1..2"--> "*" BitcoinClaim
    User "1..2" -- "*" LobbyEntry
    Stake "1" --> "0..1" ShareRateChange
    LobbyEntry --> "0..1" XfLobbyExit
    LobbyEntry --> "1" XfLobbyEnter
    Stake --> "1" StakeStart
    Stake --> "0..1" StakeGoodAccounting
    Stake --> "0..1" StakeEnd
    BitcoinClaim --> "1" Claim
    BitcoinClaim --> "0..1" ClaimAssist

    @enduml

.. uml::
    @startuml
    class GlobalState {
        lockedHeartsTotalRaw
        nextStakeSharesTotalRaw
        shareRateRaw
        stakePenaltyTotalRaw
        dailyDataCountRaw
        stakeSharesTotalRaw
        latestStakeIdRaw
        unclaimedSatoshisTotalRaw
        claimedSatoshisTotalRaw
        claimedBtcAddrCountRaw
        totalSupplyRaw
        xfLobbyForCurrentDayRaw
    }

    class DailyData {
        payoutTotal
        unclaimedSatoshisTotal
        stakeSharesTotal
    }
    class LobbyData{
    }
    class LobbyEntry{
    }

    class DailyDataUpdate {
        sender
        isAuto
    }
    GlobalState --> "*" DailyData
    GlobalState --> "*" LobbyData
    DailyData --> "1" DailyDataUpdate
    LobbyData --> "0..*" LobbyEntry

    @enduml

Domain entities
===============

User
----
Models each address that creates a stake, a lobby entry or bitcoin claim.
Addresses which simply hold the token are not tracked

Stake
-----
Models a Stake, tracking its shares, tokens, rewards, penalties and status
This is mostly implemented already, but events have to be linked

GlobalState
-----------
It holds the current state of the system. TheGraph's time travel queries could be useful to inspect past state without extra development effort.
It's mainly concerned with the total volumes of tokens, shares and claims in the system.
The basics of it is already implemented, but it lacks tracking of the DailyData and LobbyData

LobbyEntry
----------
Models the entries in the Adoption Amplifier, to mint HEX with ETH
The creation and deletion events have all the necessary data

BitcoinClaim
------------
Models HEX claims on proof of BTC ownership
The data for it is in the event. There might be some complexity in it optionally having a referer, which could be the same address as the claimToAddr

DailyData
---------
Tracks share and token creation for each day
The data isn't logged in the event, a contract call is needed
Perhaps on further inspection it makes sense to create another domain entity to have a better way to track inflation or another important parameter

LobbyData
---------
Logs aggregated data of how much eth was locked into the contract each day.
Could be updated when creating/updating LobbyEntries

Questions
=========
- Does it make sense to track the movements of HEX as a regular ERC20 token?
    - Would it add value to have some measurement of the velocity of how much the token changes hands?
- Should we track when the fees of the system are flushed and how much it makes?
    - we could track the ETH flush by the contract calls to xfLobbyFlush
    - we could track fees in HEX by tracking the Transfer events to ORIGIN_ADDR

Tasks
=====
- LobbyEntry creation (and related event entity)
- LobbyEntry update (and related event entity)
- LobbyData creation (add to LobbyEntry creation process, no need to update on update) 
- Stake update on StakeGoodAccounting
- Link Stake and ShareRateChange
- Create BitcoinClaim (it also creates a stake)
- Create DailyData (link to GlobalState, will at least require a call, better ways to show the system state might arise)
