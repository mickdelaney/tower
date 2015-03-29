import React from 'react';
import td from 'throttle-debounce';

// function _createVmZone(givenReporter:Function): VmTurnZone {
//   var defaultErrorReporter = (exception, stackTrace) => {
//     var longStackTrace = stackTrace.join("\n\n-----async gap-----\n");
//     console.error(`${exception}\n\n${longStackTrace}`);
//     throw exception;
//   };
//
//   var reporter = isPresent(givenReporter) ? givenReporter : defaultErrorReporter;
//
//   var zone = new VmTurnZone({enableLongStackTrace: assertionsEnabled()});
//   zone.initCallbacks({onErrorHandler: reporter});
//   return zone;
// }

export function bootstrap(cmp, el) {

   // var render = td.throttle(120, () => {
   //    console.log('afterTask');
   //    React.render(cmp, el);
   // });

   zone
      //.fork({ afterTask: render })
      .fork({ afterTask: () => {
         console.log('afterTask');
         React.render(cmp, el);
      } })
      .run(() => {
         console.log('run');
         React.render(cmp, el);
      });
}
