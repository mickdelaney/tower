/* @flow */


export const BidSuit = { "Clubs": 1, "Diamonds": 2, "Hearts": 3, "Spades": 4, "NoTrumps": 5 };
export const BidType = { "NoBid": 1, "Call": 2, "Double": 3, "Redouble": 4 };

export class Bid {
   static stringify(bid): string {
      switch(bid.type) {
        case BidType.NoBid:
          return "No Bid";
        case BidType.Call:
          return bid.level.toString() + ' ' + Bid.suitName(bid.suit, (bid.level == 1));
        case BidType.Double:
          return "Double";
        case BidType.Redouble:
          return "Redouble";
        default:
          throw new Error("unrecognised bid");
      }
   }

   static key(bid): string {
      let result = [ bid.type ];

      if (bid.type == BidType.Call)
         result = result.concat([ bid.level, bid.suit ]);

      return result.join('-');
   }

   static create(bid: string) {
      let shortNames = [ "", "c", "d", "h", "s", "nt"];
      bid = bid.toLowerCase();

      if (bid == "double")
         return { type: BidType.Double };
      else if (bid == "redouble")
         return { type: BidType.Redouble };
      else if (bid == "no bid")
         return { type: BidType.NoBid };
      else {
         let result = { type: BidType.Call };
         result.level = parseInt(bid[0]);
         result.suit = shortNames.indexOf(bid.slice(1));
         return result;
      }
   }

   static suitName(suit: BidSuit, singular: boolean) {
      let names = [ "", "club", "diamond", "heart", "spade", "no-trump"];
      return names[suit] + (singular ? '' : 's');
   }

   static compare(bid1, bid2): number {
      if (bid1.type != bid2.type) {
         return bid1.type - bid2.type;
      }
      else {
         if (bid1.type == BidType.Call) {
            if (bid1.level == bid2.level)
               return bid1.suit - bid2.suit;
            else
               return bid1.level - bid2.level;
         }
         else {
            return 0;
         }
      }
   }
}
