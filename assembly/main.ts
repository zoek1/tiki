import {ContractPromiseBatch, PersistentVector, logging, env, storage, context, u128, PersistentDeque, PersistentMap} from "near-sdk-as";
import {Event, Ticket} from "./models";
import {ERROR_MAXIMUM_TOKEN_LIMIT_REACHED} from "./event";

type TokenId = i32
type AccountId = string


export const events = new PersistentVector<Event>('events')
const escrowAccess = new PersistentMap<AccountId, AccountId>('b')


export function factory(name: string, symbol: string, seatPrice: u128, startDate: string, endDate: string, initialSupply: i32): u64 {
    const host = context.predecessor
    const id: i32 = events.length
    assert(symbol.indexOf(' ') == -1, 'Symbols doesnt support whitespaces')
    const attendees = new PersistentVector<string>('tickets.'+symbol+'.'+host)
    const tickets = new PersistentMap<string, Ticket>('tickets.'+symbol+'.'+host)
    const occupied: i32 = 0
    const start: u64 = U64.parseInt(startDate)
    const end: u64 = U64.parseInt(endDate)
    const event: Event = { id, host, name, symbol, occupied, seatPrice, start, end, initialSupply, attendees, tickets }

    events.pushBack(event)

    return u64(events.length)
}

export function get_event(eventId: i32): Event {
    return events[eventId]
}

export function get_events(): Array<Event> {
    let _events_array = new Array<Event>();
    if(events.length != 0) {
        for(let i: i32 = 0; i < events.length; i++) {
            _events_array.push(events[i]);
        }
    }

    return _events_array;
}

export function purchase(eventId: i32): boolean {
    const caller = context.predecessor
    let amount = context.attachedDeposit
    const event = events[eventId]
    let seatPrice = event.seatPrice
    let totalSupply = event.initialSupply
    let numSeats = event.occupied
    let nextSeat = numSeats + 1
    let current_time = env.block_timestamp()


    assert(amount == event.seatPrice, 'Deposit the exact amount ' + (amount).toString())
    assert(nextSeat < totalSupply, ERROR_MAXIMUM_TOKEN_LIMIT_REACHED)
    assert(event.tickets.contains(caller) == false, 'Only one ticket per account')
    assert(current_time <= event.end, 'The event finished ' + current_time.toString())


    let new_ticket: Ticket  =  {owner: caller, price: seatPrice, purchased_at: current_time, check_in: false, check_in_at: u64(0)}

    event.attendees.pushBack(caller)
    event.tickets.set(caller, new_ticket)
    logging.log(event.attendees)

    event.occupied = nextSeat

    events[eventId] = event
    logging.log(event.occupied)


    ContractPromiseBatch.create(event.host).transfer(amount)
    // return the tokenId – while typical change methods cannot return data, this
    // is handy for unit tests
    return true
}

export function get_attendess(eventId: i32): Array<Ticket> {
    const _tickets = new Array<Ticket>()
    const event = events[eventId]

    if(event.attendees && event.tickets && event.attendees.length != 0) {
        for(let i: i32 = 0; i < event.attendees.length; i++) {
            let address = event.attendees[i]
            _tickets.push(event.tickets.getSome(address));
        }
    }

    return _tickets;
}

export function check_in(eventId: i32): boolean {
    const caller = context.predecessor
    const event = events[eventId]
    let current_time = env.block_timestamp()

    const ticket = event.tickets.getSome(caller)

    if (!ticket.check_in) {
        ticket.check_in = true
        ticket.check_in_at = current_time
        event.tickets.set(caller, ticket)

        return true
    }

    return false
}

export function check_attendee(eventId: i32, caller: string): boolean {
    const event = events[eventId]

    return  event.tickets.get(caller) !== null
}

export function check_check_in(eventId: i32, caller: string): boolean {
    const event = events[eventId]
    const ticket = event.tickets.get(caller)
    if (ticket !== null) {
        return ticket.check_in
    }

    return false;
}

// NEP#4 implementation

// Grant access to the given `accountId` for all tokens the caller has
export function grant_access(escrow_account_id: AccountId): void {
    escrowAccess.set(context.predecessor, escrow_account_id)
}

// Revoke access to the given `accountId` for all tokens the caller has
export function revoke_access(escrow_account_id: AccountId): void {
    escrowAccess.delete(context.predecessor)
}

// Transfer the given `token_id` to the given `new_owner_id`. Account `new_owner_id` becomes the new owner.
// Requirements:
// * The caller of the function (`predecessor`) should have access to the token.
export function transfer_from(owner_id: string, new_owner_id: string, token_id: i32): void {
    const caller = context.predecessor

    // fetch token owner and escrow; assert access
    const event = events[token_id]
    const ticket = event.tickets.getSome(owner_id)
    assert(ticket.owner == owner_id, 'No exists the given ticket')
    const escrow = escrowAccess.get(ticket.owner)
    assert([ticket.owner, escrow].includes(caller), 'Transfer Permission no allowed')

    ticket.owner = new_owner_id
    event.tickets.delete(owner_id)
    event.tickets.set(new_owner_id, ticket)
}


// Transfer the given `token_id` to the given `new_owner_id`. Account `new_owner_id` becomes the new owner.
// Requirements:
// * The caller of the function (`predecessor`) should be the owner of the token. Callers who have
// escrow access should use transfer_from.
export function transfer(new_owner_id: string, token_id: i32): void {
    const caller = context.predecessor

    // fetch token owner and escrow; assert access
    const event = events[token_id]
    const ticket = event.tickets.getSome(caller)
    assert(ticket.owner == caller, 'Transfer permission no allowed')
    let new_ticket: Ticket  =  {
        owner: new_owner_id,
        price: ticket.price,
        purchased_at: ticket.purchased_at,
        check_in: ticket.check_in,
        check_in_at: ticket.check_in_at}

    event.tickets.delete(caller)
    event.tickets.set(new_owner_id, new_ticket)

    if(event.attendees && event.tickets && event.attendees.length != 0) {
        for(let i: i32 = 0; i < event.attendees.length; i++) {
            let address = event.attendees[i]
            if (address == caller) {
                event.attendees[i] = new_owner_id
                break
            }
        }
    }
}

export function mint(token_id: i32, amount: i32): void {
    const caller = context.predecessor

    const event = events[token_id]

    assert(event.host == caller, 'Not allowed mint more tokens')
    assert(amount + event.initialSupply > amount, 'Invalid mint amount')
    event.initialSupply = event.initialSupply + amount
}

export function burn(token_id: i32, amount: i32): void {
    const caller = context.predecessor

    const event = events[token_id]

    assert(event.host == caller, 'Not allowed mint more tokens')
    assert(amount - event.initialSupply < amount, 'Invalid burn amount')
    assert(amount - event.initialSupply > event.occupied, 'Not allowed decrease due to existing tickets')
    event.initialSupply = event.initialSupply + amount
}

/****************/
/* VIEW METHODS */
/****************/

// Returns `true` or `false` based on caller of the function (`predecessor`) having access to account_id's tokens
export function check_access(account_id: AccountId): boolean {
    const caller = context.predecessor

    // if we haven't set an escrow yet, then caller does not have access to account_id
    if (!escrowAccess.contains(account_id)) {
        return false
    }

    const escrow = escrowAccess.getSome(account_id)
    return escrow == caller
}

// Get an individual owner by given `tokenId`
export function get_token_owner(token_id: TokenId): string {
    const event = events[token_id]

    return event.host
}