import {ContractPromiseBatch, PersistentVector, logging, env, storage, context, u128, PersistentDeque, PersistentMap} from "near-sdk-as";
import {Event, Ticket} from "./models";
import {ERROR_MAXIMUM_TOKEN_LIMIT_REACHED} from "./event";

export const events = new PersistentVector<Event>('events')


export function factory(name: string, symbol: string, seatPrice: u128, start: u128, end: u128, initialSupply: i32): u64 {
    const host = context.predecessor
    const id = events.length
    const attendees = new PersistentVector<string>('tickets.'+host)
    const tickets = new PersistentMap<string, Ticket>('tickets.'+host)
    const occupied = 0
    const event: Event = { id, host, name, symbol, occupied, seatPrice, start, end, initialSupply, attendees, tickets}

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
    let current_time = u128.from(env.block_timestamp())


    assert(amount == event.seatPrice, 'Deposit the exact amount ' + (amount).toString())
    assert(nextSeat < totalSupply, ERROR_MAXIMUM_TOKEN_LIMIT_REACHED)
    assert(event.tickets.contains(caller) == false, 'Only onw ticket per account')
    assert(current_time <= event.end, 'The event finished ' + current_time.toString())


    let new_ticket: Ticket  =  {owner: caller, price: seatPrice, purchased_at: current_time, check_in: false, check_in_at: u128.from(0)}

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
    let current_time = u128.from(env.block_timestamp())

    const ticket = event.tickets.getSome(caller)

    if (!ticket.check_in) {
        ticket.check_in = true
        ticket.check_in_at = current_time
        event.tickets.set(caller, ticket)

        return true
    }

    return false
}