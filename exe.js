// build.js
const exe = require("@angablue/exe");
const rcedit = require('rcedit');

const build = exe({
    "entry": "src/index.js",
    "out": "croissant-launcher.exe",
    "skipBundle": false,
    "version": "{package:version}",
    "icon": "src/icon.ico",
    "executionLevel": "asInvoker",
    "windowsHideConsole": true,
    "properties": {
        "FileDescription": "{package:description}",
        "ProductName": "Croissant Launcher",
        "LegalCopyright": "Copyright Croissant-API",
        "OriginalFilename": "{package:name}"
    }
});
build.then(() => {
    console.log("Executable created successfully.");
    // Optionally, you can modify the executable properties using rcedit
    rcedit("croissant-launcher.exe", {
        "version": "1.0.0",
        "fileVersion": "1.0.0",
        "productVersion": "1.0.0"
    }).then(() => {
        console.log("Executable properties updated successfully.");
    }).catch(err => {
        console.error("Error updating executable properties:", err);
    });
}).catch(err => {
    console.error("Error creating executable:", err);
});
module.exports = build;