import { env, context, u128, logging, storage, PersistentMap } from "near-sdk-as";
import {Ticket} from "./models";

type AccountId = string
type TokenId = u64

export const MAX_SUPPLY = u64(10)

const attendees = new PersistentMap<TokenId, AccountId>('a')
const escrowAccess = new PersistentMap<AccountId, AccountId>('b')
const tickets = new PersistentMap<AccountId, Ticket>('c')

export const ERROR_NO_ESCROW_REGISTERED = 'Caller has no escrow registered'
export const ERROR_CALLER_ID_DOES_NOT_MATCH_EXPECTATION = 'Caller ID does not match expectation'
export const ERROR_MAXIMUM_TOKEN_LIMIT_REACHED = 'Maximum token limit reached'
export const ERROR_OWNER_ID_DOES_NOT_MATCH_EXPECTATION = 'Owner id does not match real token owner id'
export const ERROR_TOKEN_NOT_OWNED_BY_CALLER = 'Token is not owned by the caller. Please use transfer_from for this scenario'
export const ERROR_TOKEN_ALREADY_MINTED = 'Token already minted'


export function grant_access(escrow_account_id: string): void {
    escrowAccess.set(context.predecessor, escrow_account_id)
}

export function revoke_access(escrow_account_id: string): void {
    escrowAccess.delete(context.predecessor)
}

export function transfer_from(owner_id: string, new_owner_id: string, token_id: TokenId = u64(0)): void {
    const predecessor = context.predecessor

    const owner = attendees.getSome(token_id)
    assert(owner == owner_id, ERROR_OWNER_ID_DOES_NOT_MATCH_EXPECTATION)
    const escrow = escrowAccess.get(owner)
    assert([owner, escrow].includes(predecessor), ERROR_CALLER_ID_DOES_NOT_MATCH_EXPECTATION)

    attendees.set(token_id, new_owner_id)
}


export function transfer(new_owner_id: string, token_id: TokenId = u64(0)): void {
    const predecessor = context.predecessor

    const owner = attendees.getSome(token_id)
    assert(owner == predecessor, ERROR_TOKEN_NOT_OWNED_BY_CALLER)

    attendees.set(token_id, new_owner_id)
}



export function check_access(account_id: string): boolean {
    const caller = context.predecessor

    assert(caller != account_id, ERROR_CALLER_ID_DOES_NOT_MATCH_EXPECTATION)

    if (!escrowAccess.contains(account_id)) {
        return false
    }

    const escrow = escrowAccess.getSome(account_id)
    return escrow == caller
}

// Get an individual owner by given `tokenId`
export function get_token_owner(token_id: TokenId = u64(0)): string {
    return attendees.getSome(token_id)
}

export function get_token_name(): string {
    return storage.getSome<string>('tokenName')
}

export function get_token_symbol(): string {
    return storage.getSome<string>('tokenSymbol')
}

export function is_owner(owner: AccountId): boolean {
    return owner == storage.get<string>("owner");
}
/********************/
/* NON-SPEC METHODS */
/********************/

// Note that ANYONE can call this function! You probably would not want to
// implement a real NFT like this!
export function purchase(): u64 {
    const caller = context.predecessor
    let amount = context.attachedDeposit
    let seatPrice = storage.getSome<u128>('seatPrice')
    let totalSupply = storage.getSome<u64>('totalSupply')
    let numSeats = storage.getSome<u64>('available')
    let nextSeat = numSeats + 1
    let current_time = u128.from(env.block_timestamp())
    let finish_at = storage.getSome<u128>('end')

    assert(amount == seatPrice, 'Deposit the exact amount')
    assert(numSeats <= totalSupply, ERROR_MAXIMUM_TOKEN_LIMIT_REACHED)
    assert(tickets.get(caller) == null, 'Only onw ticket per account')
    assert(current_time <= finish_at, 'The event finished')

    attendees.set(nextSeat, caller)
    let new_ticket  = new Ticket()
    new_ticket.owner = caller
    new_ticket.price = seatPrice
    new_ticket.purchased_at = current_time

    tickets.set(caller, new_ticket)


    // increment and store the next tokenId
    storage.set<u64>('available', nextSeat)

    // return the tokenId – while typical change methods cannot return data, this
    // is handy for unit tests
    return nextSeat
}