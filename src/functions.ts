import rls from 'readline-sync';
import fs from 'fs';
import util, { inherits } from 'util';
import { exec as lexec } from 'child_process';
import path from 'path';
import electron from 'electron-packager'
import { copyFileSync, copyFolderRecursiveSync } from './helpers'

const exec = util.promisify(lexec);
const electronMap = "electron";

export const init = async (project?: string, platform?: string, shouldBuild?: boolean) => {

    let selectedProject;

    if (!project) {
        const obj = JSON.parse(fs.readFileSync('angular.json', 'utf8'));
        const projects: string[] = [];

        for (const project in obj.projects) {
            projects.push(project);
        }

        const projectAnswer = rls.keyInSelect(projects, 'Select your project', {
            cancel: false
        });

        selectedProject = projects[projectAnswer]
    } else {
        selectedProject = project;
    }

    if (!fs.existsSync(electronMap + "/" + selectedProject)) {
        fs.mkdirSync(electronMap);
        fs.mkdirSync(electronMap + "/" + selectedProject);
        fs.mkdirSync(electronMap + "/" + selectedProject + "/dist");
        fs.writeFileSync(electronMap + "/" + selectedProject + "/package.json",
            `{
    "name": "${selectedProject.toLowerCase()}",
    "main": "./main.js",
    "author": "",
    "version": "0.0.1",
    "devDependencies": {
        "electron": "^4.0.6",
        "electron-packager": "^13.1.0"
    }
}`);
        fs.writeFileSync(electronMap + "/" + selectedProject + "/main.js",
            `const { app, BrowserWindow } = require("electron");
const path = require("path");
const url = require("url");

let win;

function createWindow() {
    win = new BrowserWindow({ width: 800, height: 600 });

    // load the dist folder from Angular
    win.loadURL(
        url.format({
            pathname: path.join(__dirname, \`/dist/index.html\`),
            protocol: "file:",
            slashes: true
        })
    );

    // The following is optional and will open the DevTools:
    // win.webContents.openDevTools()

    win.on("closed", () => {
        win = null;
    });
}

app.on("ready", createWindow);

// on macOS, closing the window doesn't quit the app
app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

// initialize the app's main window
app.on("activate", () => {
    if (win === null) {
        createWindow();
    }
});`);
        await exec(`cd ${electronMap}/${selectedProject} && npm i`);
        console.log("Initialization complete.");
    } else {
        console.warn("Existing electron project detected, skipping initialization.");
    }

    if (!shouldBuild) {
        const buildAnswer = rls.keyInYNStrict('Would you like to build now?');

        if (buildAnswer) {
            await build(selectedProject);
        }

        const electronAnswer = rls.keyInYNStrict('Would you like to compile your electron app now?');

        if (electronAnswer) {
            await compile(selectedProject, platform);
        }
    } else {
        await build(selectedProject);
        await compile(selectedProject, platform);
    }

    return;
}

export const build = async (project?: string) => {
    console.log("Building... (this may take a while)");
    await exec(`ng build --project ${project} --base-href ./ --prod`);
    console.log("Built successfully");
    return;
};

export const compile = async (project?: string, platform?: string) => {
    console.log("Copying required files");
    const files = fs.readdirSync(`dist/${project}`);
    for (const file of files) {
        var curSource = path.join(`dist/${project}`, file);
        if (fs.lstatSync(curSource).isDirectory()) {
            copyFolderRecursiveSync(curSource, electronMap + "/" + project + "/dist");
        } else {
            copyFileSync(curSource, electronMap + "/" + project + "/dist");
        }
    }
    console.log("Files copied");

    if (!platform) {
        const platforms = ['all', 'darwin', 'linux', 'mas', 'win32']
        let platformAnswer = rls.keyInSelect(platforms, 'Select the platform you want to compile for:', {
            cancel: false
        })
        platform = platforms[platformAnswer];
    }

    try {
        await electron({
            dir: electronMap + "/" + project,
            platform: platform as any,
            name: project,
            overwrite: true,
            out: 'builds'
        });
    } catch (e) {
        console.error(e);
    }

    return;
}