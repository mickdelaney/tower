/* @flow */

import Reflux from 'reflux';

export const NotificationActions = Reflux.createActions([
   "info",
   "warn",
   "error",
   "question",
   "success",
   "notify",
   "dismiss"
]);

/**
 * Store for showing notifications to the user and
 * optionally receiving a response. Notifications are
 * assigned a unique id which can be used to dismiss them.
 */
export const NotificationStore = Reflux.createStore({
   init: function() {
      this.listenToMany(NotificationActions);
      this.notifications = [];
      this.currentId = 1;
   },
   onInfo: function(opts) {
      opts = opts || {};
      opts.type = 'info';

      var notification = this.notify(opts);
      this.trigger(notification);
   },
   onWarn: function(opts) {
      opts = opts || {};
      opts.type = 'warn';

      var notification = this.notify(opts);
      this.trigger(notification);
   },
   onError: function(opts) {
      opts = opts || {};
      opts.type = 'error';

      var notification = this.notify(opts);
      this.trigger(notification);
   },
   onQuestion: function(opts) {
      opts = opts || {};
      opts.type = 'question';
      opts.timeout = opts.timeout || -1;

      var notification = this.notify(opts);
      this.trigger(notification);
   },
   onSuccess: function(opts) {
      opts = opts || {};
      opts.type = 'success';

      var notification = this.notify(opts);
      this.trigger(notification);
   },
   onNotify: function(opts) {
      var notification = this.notify(opts);
      this.trigger(notification);
   },
   notify: function(opts) {
      var notification = {};
      notification.id = this.generateId();
      notification.timestamp = new Date();
      notification.source = opts.source;
      notification.type = opts.type;
      notification.title = opts.title;
      notification.timeout = opts.timeout || 20000;
      notification.message = opts.message;
      notification.buttons = opts.buttons || [];
      notification.defaultButton = opts.defaultButton;
      this.notifications.push(notification);
      return notification;
   },
   onDismiss: function(opts) {
      var notification = this.notifications.filter((notif) => notif.id == opts.id)[0];

      if (notification) {
         this.notifications = this.notifications.filter((notif) => notif.id != opts.id);
         notification.response = opts.response;
         this.trigger(notification);
      }
   },
   generateId: function() {
      return this.currentId ++;
   }

});
