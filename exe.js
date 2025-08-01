// build.js
const exe = require("@angablue/exe");

const build = exe({
    "entry": "src/index.js",
    "out": "croissant-launcher.exe",
    "skipBundle": false,
    "version": "{package:version}",
    "icon": "src/icon.ico",
    "executionLevel": "asInvoker",
    "windowsHideConsole": true,
    "target": "windows", // Ajoutez cette ligne
    "properties": {
        "FileDescription": "{package:description}",
        "ProductName": "Croissant Launcher",
        "LegalCopyright": "Copyright Croissant-API",
        "OriginalFilename": "{package:name}"
    }
});
build.then(() => {
    console.log("Executable created successfully.");
}).catch(err => {
    console.error("Error creating executable:", err);
});
module.exports = build;