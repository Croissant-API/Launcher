# Croissant Launcher

## Overview
Croissant Launcher is an Electron-based application designed to manage and launch games efficiently. It provides a user-friendly interface and integrates with a backend server to fetch game data and handle downloads.

## Project Structure
The project is organized into several modules, each responsible for specific functionalities:

- **app/app.js**: Main entry point of the application. Initializes the Electron app, sets up the server, and manages the main application window.
- **app/mainWindow.js**: Contains the logic for creating and configuring the main Electron window.
- **app/tray.js**: Manages the system tray icon and its context menu.
- **app/server.js**: Initializes the Express server, sets up routes, and handles API requests.
- **app/websocket.js**: Sets up the WebSocket server for real-time communication regarding game downloads and launches.
- **app/games.js**: Contains functions for managing games, including checking installation status and handling downloads.
- **app/preload.js**: Configures the context for the renderer process, enabling secure communication between processes.

## Installation
1. Clone the repository:
   ```
   git clone <repository-url>
   ```
2. Navigate to the project directory:
   ```
   cd Launcher
   ```
3. Install the dependencies:
   ```
   npm install
   ```

## Usage
To start the application, run:
```
npm start
```
This will launch the Electron app and start the server.

## Contributing
Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License
This project is licensed under the MIT License. See the LICENSE file for details.