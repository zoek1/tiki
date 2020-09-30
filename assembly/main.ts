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
