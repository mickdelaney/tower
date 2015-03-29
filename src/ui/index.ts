/// <reference path="../_references.d.ts" />

import angular = require("angular");
require("angular-material"); // jspm has a shim to load the css
require("angular-ui-router");
require("./index.css");

import cards = require("./cards/index");
import board = require("./board/index");
import player = require("./player/index");
import MenuController = require('./menu/menu-controller');
import TableController = require('./table/table-controller');

export var Module: ng.IModule = angular.module("tower.ui", [
	"ngMaterial", "ui.router", cards.Module.name, board.Module.name, player.Module.name
]);

Module.config(["$stateProvider", "$urlRouterProvider", "$locationProvider", ($stateProvider: any, $urlRouterProvider: any, $locationProvider: ng.ILocationProvider) => {
		console.log("Application started");

    	$locationProvider.html5Mode(true);

			$stateProvider.state('menu', {
				controller: MenuController,
				controllerAs: "menuCtrl",
				template: require('./menu/menu-view.html'),
				url: '/menu'
			});

			$stateProvider.state('table', {
				controller: TableController,
				controllerAs: "tableCtrl",
				template: require('./table/table-view.html'),
                params: {
                    "game": {},
                    "players": []
                }

			});

      $urlRouterProvider.otherwise("/menu");
    }]);
