const { execFile } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const inputFile = path.join(projectRoot, "styles/less/main.less");
const outputFile = path.join(projectRoot, "styles/css/main.css");
const lessRoot = path.join(projectRoot, "styles/less");
const lesscBin = path.join(projectRoot, "node_modules/.bin/lessc");

let buildTimer = null;
let isBuilding = false;
let fileState = new Map();

function compileLess() {
  if (isBuilding) {
    return;
  }

  isBuilding = true;

  execFile(lesscBin, [inputFile, outputFile], (error, stdout, stderr) => {
    isBuilding = false;

    if (stdout) {
      process.stdout.write(stdout);
    }

    if (stderr) {
      process.stderr.write(stderr);
    }

    if (error) {
      console.error("[watch-less] compile failed");
      console.error(error.message);
      return;
    }

    console.log("[watch-less] compiled styles/css/main.css");
  });
}

function scheduleCompile() {
  clearTimeout(buildTimer);
  buildTimer = setTimeout(compileLess, 80);
}

function collectLessFiles(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = [];

  entries.forEach((entry) => {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectLessFiles(fullPath));
      return;
    }

    if (entry.isFile() && entry.name.endsWith(".less")) {
      files.push(fullPath);
    }
  });

  return files;
}

function snapshotFiles() {
  const nextState = new Map();

  collectLessFiles(lessRoot).forEach((filePath) => {
    const stats = fs.statSync(filePath);
    nextState.set(filePath, stats.mtimeMs);
  });

  return nextState;
}

function detectChanges() {
  const nextState = snapshotFiles();
  let changed = false;

  if (nextState.size !== fileState.size) {
    changed = true;
  } else {
    for (const [filePath, mtimeMs] of nextState.entries()) {
      if (fileState.get(filePath) !== mtimeMs) {
        changed = true;
        break;
      }
    }
  }

  fileState = nextState;

  if (changed) {
    console.log("[watch-less] detected Less changes");
    scheduleCompile();
  }
}

fileState = snapshotFiles();
compileLess();
setInterval(detectChanges, 1000);
process.stdin.resume();
