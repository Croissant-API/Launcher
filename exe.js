// build.js
const exe = require("@angablue/exe");

const build = exe({
    "entry": "src/index.js",
    "out": "croissant-launcher.exe",
    "skipBundle": false,
    "version": "{package:version}",
    "icon": "src/icon.ico",
    "executionLevel": "asInvoker",
    "properties": {
        "FileDescription": "{package:description}",
        "ProductName": "Croissant Launcher",
        "LegalCopyright": "Copyright Croissant-API",
        "OriginalFilename": "{package:name}"
    }
});

build.then(() => {
    if(fs.existsSync("croissant-launcher.exe")) {
        console.log("Executable created successfully!");
        // Move into the "out" folder, create it if it doesn't exist
        const outDir = path.join(__dirname, 'out');
        if (!fs.existsSync(outDir)) {
            fs.mkdirSync(outDir);
        }
        fs.copyFileSync("croissant-launcher.exe", path.join(outDir, "croissant-launcher.exe"));
    } else {
        console.error("Failed to create executable.");
    }
}).catch(err => {
    console.error("Build failed:", err);
});