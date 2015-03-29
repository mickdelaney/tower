var gulp = require('gulp');
var tasks = require('./tasks');

tasks
    .addClean(['jspm_packages/**', 'build/**', 'reports/**'])
    .addBundle({
       entryJs: "src/index.ts"
    })
    .addServer({
    	port: 8888,
    	verbose: true
    })
    .addSpecs({

    })
    .build(gulp);
