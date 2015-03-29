/* @flow */

import React from 'react';
import Reflux from 'reflux';

import {PlayerStore} from "../../stores/player-store";
import {GameStore, GameActions} from "../../stores/game-store";
import {GameState} from "../../model/game/game-state";
import {Seat, seatName} from "../../model/core/seat";

import {HandComponent} from "./hand.jsx";
import {BiddingBox} from "./bidding-box.jsx";
import {BiddingHistory} from "./bidding-history.jsx";
import {TrickComponent} from "./trick.jsx";

/**
 * Top-Level View for displaying the current game from the GameStore
 */
export class Table extends React.Component {

   constructor(props) {
      super(props);

      this.players = PlayerStore.players;
      //this.game = GameStore.currentState();
   }

   render() {
      console.log('rendering table');
      this.game = GameStore.currentState();

      var players = this.players.map((player) => {
         return (
            <section className={"table-edge-" + Seat.name(player.seat)} key={player.seat}>
               <header className="table-player-name">{player.name}</header>
               <div className={"table-hand-" + Seat.name(player.seat)}>
                  <HandComponent seat={player.seat}
                                 game={this.game}/>
               </div>
            </section>
         );
      });

      var board = this.game.biddingHasEnded ?
         board = <TrickComponent game={this.game}/>
         : board = <BiddingHistory board={this.game.currentBoard}/>;

      var biddingBox = <BiddingBox className="table-bidding-box" game={this.game}/>

      return (
         <div className="bridge-table">
            <div className="table-players">
               {players}
            </div>
            <div className="table-board">
               {board}
            </div>
            <div className="table-bidding-box">
               {biddingBox}
            </div>
         </div>
      );
   }
}
