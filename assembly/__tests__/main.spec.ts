import {events, mint} from '../main';
import { storage, Context, u128 } from "near-sdk-as";

describe("Greeting ", () => {
    it("should be set and read", () => {
        mint("hello world", 'HELLO', u128.from(10),
            u128.from(1601466222), u128.from(1601898222), i64(20));
        assert(events.length == 1, 'No contract was created')
    });
});
