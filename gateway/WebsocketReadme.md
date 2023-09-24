# Project Name
MyGateway - WebSocket Gateway Implementation

The MyGateway class serves as a WebSocket gateway in a NestJS application, providing real-time communication between clients and the server using WebSocket technology. It handles various WebSocket events and interactions related to user activities within collaborative wiki notes.

# Installation
to install and set up the library, run:
```
npm install @nestjs/platform-socket.io
npm install @nestjs/websockets
```

### CORS POLICY
* Can set in main.ts or gateway file
* Cross-origin resource sharing (CORS) is a standard mechanism that allows JavaScript XMLHttpRequest (XHR) calls executed in a web page to interact with resources from non-origin domains. 
* CORS is a commonly implemented solution to the same-origin policy that is enforced by all browsers.  

```
// In Main.ts
const server = super.createIOServer(port, {
    ...options,
    allowEIO3: true,
    cors: {
        origin: true,
        credentials: true,
        },
    transports: ["polling", "websocket"]
});
return server;

OR

// In Gateway file
@WebSocketGateway(
    cors: { 
        origin: true, 
        credentials: true 
    }, 
    transports: ["polling", "websocket"]
)
```

## JWT Token retrieve
```
let jwtToken = req.handshake.headers.authorization;
// To remove Bearer
jwtToken = jwtToken.split(' ')[1];
return jwtToken;
```

## OnModuleInit
```    
@UseGuards(JwtAuthGuard)
onModuleInit() {
    this.server.on('connection', (socket: Socket) => {
         // Add any initialization logic here if needed
    });
}
```
- The onModuleInit() method is automatically triggered when a connection is established with the WebSocket server. It sets up an event listener to handle incoming socket connections and perform necessary actions.

## Disconnect

```
async handleDisconnect(client: Socket) {

    // Get the user in which room before remove 
    let roomNumber = await this.gatewayService.getRoomNumberByClientId(client.id);

    // Remove the disconnected client from all rooms using removeClientFromRoom method
    this.gatewayService.removeClientFromRoom(client.id);

    // Server send back current user data in the room to the client
    let roomName = "ROOM " + roomNumber;
    let roomDetail = await this.gatewayService.retrieveSpecificRoomData(roomName);
    await this.server.to(roomName).emit("display_user", { 
        roomDetail: roomDetail,
    });
}
```
 - The handleDisconnect() function is automatically invoked when a client disconnects from the WebSocket server. It manages the cleanup process, ensuring that the disconnected client is removed from relevant rooms and that other clients are notified of the changes.


## Event Handlers
### handleDisconnect(client: Socket)
- Description: Handles the disconnection of a client from the WebSocket server.
- Functionality: Removes the disconnected client from relevant rooms, updates room data, and emits signals to notify other clients in the room.
### joinRoom(id: string, client: Socket, user: any)
- Description: Handles a client's request to join a specific room (associated with a wiki note) and emits signals accordingly.
- Functionality: Joins the client to the specified room, updates room data, and emits signals to notify clients in the room of the new user's presence.
### editStart(roomId: any, user: any, client: Socket)
- Description: Handles the start of editing a note and notifies other clients in the same room.
- Functionality: Marks the client as actively editing a note in the room and emits signals to update room data and inform other clients about the editing status.
### editEnd(roomId: any, user: any, client: Socket)
- Description: Handles the end of editing a note and notifies other clients in the same room.
- Functionality: Updates the editing status of the client in the room, emits signals to update room data, and notifies other clients that the user has stopped editing.
### update_note(note_content: any, roomId: any, user: any, client: Socket)
- Description: Handles the updating of a note's content and notifies other clients in the same room.
- Functionality: Saves the updated note content to the database, emits signals to notify clients about the updated note, and provides relevant user and note information.

## Usage of Decorators and Guards
### @UseGuards(JwtAuthGuard): 
- Specifies that certain methods require authentication using JwtAuthGuard before they can be executed.

### @SubscribeMessage(eventName): 
- Decorates methods to listen for specific WebSocket events (messages) sent by clients.

### @MessageBody(paramName): 
- Decorates method parameters to extract data from the incoming WebSocket message.

### @ConnectedSocket(): 
- Decorates method parameters to inject the connected socket instance.

### @User(): 
- Decorates method parameters to inject user data obtained from the authentication process.



