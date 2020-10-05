import {PersistentMap, PersistentVector, u128} from "near-sdk-as";

@nearBindgen
export class Ticket {
    purchased_at: u64
    owner: string
    price: u128
    check_in: boolean
    check_in_at: u64
}

@nearBindgen
export class Event {
    id: i32;
    host: string
    name: string;
    symbol: string;
    occupied: i32;
    seatPrice: u128;
    start: u64;
    end: u64;
    initialSupply: i32;
    attendees: PersistentVector<string>
    tickets: PersistentMap<string, Ticket>
}