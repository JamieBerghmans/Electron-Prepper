#!/usr/bin/env node
import program from 'commander';
import { init, build, compile } from './functions';

program.option('-p --project <project>', 'The name of your project')
    .option('--platform <electron platform>', 'The electron platform to build for')
    .option('-b --build', "Build project")
    .option('--init', "Initialize project")
    .parse(process.argv);

(async () => {

    const project = program.project;
    const platform = program.platform;
    const buildVal = program.build;
    const initVal = program.init

    if (initVal) {
        if (buildVal) {
            await init(project, platform, true);
        } else {
            await init(project, platform, false)
        }
    } else {

        if (project) {
            if (buildVal) {
                await build(project)
            }

            await compile(project, platform);
        } else {
            console.log("You must specify a project to compile");
        }
    }

    process.exit(0);
})();