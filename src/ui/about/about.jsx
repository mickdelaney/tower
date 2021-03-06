/* @flow */

import React from 'react';

/**
 * Top-Level view for the about page
 */
export class AboutView extends React.Component {

   constructor(props) {
      super(props);
   }

   render() {
      console.log('rendering about');

      return (
         <div className="about-container">
            <section>
              <h3>About Tower</h3>
              <p>
                Welcome to Tower!. I use it as sandpit where I can try out new technologies, 
                tools and techniques which I am interested in. At some point during my lifetime I may even finish it, but that's not what's important right now.

                The application you are using is developed in ES6 using ReactJS and uses the Flux architecture. It is built using SystemJS, JSPM and Babel.
                I have also ported this application to <a href="https://github.com/frankwallis/tower/tree/angular2">Angular2</a>, 
                and combined Angular2 Zones with ReactJS to create the world's first <a href="https://github.com/frankwallis/tower/blob/react-zones/src/ui/">react zones</a> application!
                It is a work in progress, so please excuse any strange behaviours, or send a pull request :)
              </p>
            </section>
            <section>
              <h3>Roadmap</h3>
              <ul>
                <li>Implement the playing strategies based on <a href="http://www.aifactory.co.uk/newsletter/2011_02_mcts_static.htm">Information Set Monte Carlo Tree Search</a> algorithm</li>
                <li>Select a proper immutable data library</li>
                <li>Integration Tests</li>
                <li>Better shuffling algorithm</li>
                <li>Rewrite in Om!</li>
              </ul>
            </section>
            <section>
              <h3>About Me</h3>
              <p>I am a software developer based in London</p>
            </section>
            
         </div>
      );
   }
}
