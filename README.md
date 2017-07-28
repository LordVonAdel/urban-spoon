# Urban Spoon
*Note: This game is still in early development!*


Urban-Spoon is a 2D game with bases and ballistical weapons.
The server is a node.js application, which hosts a webserver with socket.io to communicate with the clients in realtime

## Browser support
The game is tested and works in 
* Chrome
* Firefox
* Edge

## Installation
To run the server you need to have node.js installed. Clone the repository and run **npm init** the directory where **package.js** is located. When the process is finished you can start the server via **node app.js**. When you run this on a server, I recommend to use a npm module like [**forever**](https://www.npmjs.com/package/forever) or [**pm2**](https://www.npmjs.com/package/pm2) to manage your node applications. These will restart the applications automatically, when they crash or the system reboots.

The game runs by default on port 4217. This can be changed in **config.json**.
