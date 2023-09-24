import { OnModuleInit, UseGuards } from "@nestjs/common";
import { MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer, ConnectedSocket, WsException } from "@nestjs/websockets";
import { Server, Socket } from 'socket.io';
import { GatewayService } from './gateway.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { User } from 'src/common/decorator/user.decorator';
import { PoolConnection } from 'mysql';
import { QpService } from 'src/common/qp/qp.service';

@WebSocketGateway()
export class MyGateway implements OnModuleInit {

    @WebSocketServer()
    server: Server;

    constructor(private readonly gatewayService: GatewayService, private readonly qp: QpService) { }

    /**
     * onModuleInit() will be automatically being called when connection start
     */
    @UseGuards(JwtAuthGuard)
    onModuleInit() {
        this.server.on('connection', (socket: Socket) => { });
    }

    /**
     * handleDisconnect() is automatically called when a client disconnects
     */
    async handleDisconnect(client: Socket) {

        // Get the user in which room before remove 
        let roomNumber = await this.gatewayService.getRoomNumberByClientId(client.id);

        // Remove the disconnected client from all rooms using removeClientFromRoom method
        this.gatewayService.removeClientFromRoom(client.id);
        await this.gatewayService.removeClientFromIsEditingRoom(client.id);

        // Server send back current user data in the room to the client
        let roomName = "ROOM " + roomNumber;
        let roomDetail = await this.gatewayService.retrieveSpecificRoomData(roomName);
        await this.server.to(roomName).emit("display_user", { // roomName - server will emit who is not editing signal to specific roomName
            roomDetail: roomDetail,
        });
    }

    /**
     * Signal 15.1.1: Enter Note - Client side to emit signal to server side.
     *              : When user enters a wiki notes, this event would get triggered.
     *              : This event tells server that a person is ready to subscribe to a specific room (room can be identified using wiki notes ID)
     */
    @UseGuards(JwtAuthGuard)
    @SubscribeMessage('enter_note')
    async joinRoom(@MessageBody("id") id: number, @ConnectedSocket() client: Socket, @User() user: any) {
        let con: PoolConnection;
        try {
            if (id === undefined) {
                throw new Error();
            } else {
                let roomName = "ROOM " + id; // To get Room Name
                client.join(roomName);       // To let client join into the roomName
                await this.gatewayService.clientServerLink(roomName, client.id, user);
                let roomDetail = await this.gatewayService.retrieveSpecificRoomData(roomName);
                con = await this.qp.connectWithTbegin();
                let noteContent = await this.gatewayService.retrieveNoteDataFromDatabase(id, con);
                this.server.to(roomName).emit('enter_note_success', { // roomName - server will emit enter note success to specific roomName
                    message: "Enter Room Success", // wait for front end implementation to decide what data is needed
                });
                let getWhoIsEditing = await this.gatewayService.getWhoIsEditing(roomName);
                this.server.to(roomName).emit('display_user', { // roomName - server will emit enter note success to specific roomName

                    roomDetail: roomDetail, // wait for front end implementation to decide what data is needed
                    isEditing: getWhoIsEditing
                });
                this.server.to(roomName).emit('note_content', { // roomName - server will emit enter note success to specific roomName

                    noteContent: noteContent, // wait for front end implementation to decide what data is needed
                });
            }

        } catch (error) {
            if (con) await this.qp.rollbackAndCloseConnection(con);
            throw new WsException(error);
        }
    }

    /**
     * Signal 15.1.2: Start Editing - Client side to emit signal to server side.
     *              : This should get triggered when someone click on ‘Edit Note’ button
     *              : **** To discuss whether backend wants to keep track of who is editing this note currently ****
     */
    @UseGuards(JwtAuthGuard)
    @SubscribeMessage('edit_start')
    async editStart(@MessageBody("id") roomId: any, @User() user: any, @ConnectedSocket() client: Socket) {
        try {
            let roomName = "ROOM " + roomId;
            let roomDetail = await this.gatewayService.retrieveSpecificRoomData(roomName);
            await this.gatewayService.isEditing(roomName, client.id, user);
            let getWhoIsEditing = await this.gatewayService.getWhoIsEditing(roomName);
            this.server.to(roomName).emit('is_editing', { // roomName - server will emit who is_editing signal to specific roomName
                roomDetail: roomDetail,
                isEditing: getWhoIsEditing
            });
        } catch (error) {
            throw new WsException(error)
        }
    }

    /**
     * Signal 15.1.3: Edit End - Client side to emit signal to server side.
     *              : This should get triggered when someone click on ‘Done’ button.
     *              : **** Update DB clear user who is editing ****
     */
    @UseGuards(JwtAuthGuard)
    @SubscribeMessage('edit_end')
    async editEnd(@MessageBody("id") roomId: any, @User() user: any, @ConnectedSocket() client: Socket) {
        try {
            let roomName = "ROOM " + roomId;
            let roomDetail = await this.gatewayService.retrieveSpecificRoomData(roomName);
            await this.gatewayService.removeClientFromIsEditingRoom(client.id);
            let getWhoIsEditing = await this.gatewayService.getWhoIsEditing(roomName);
            this.server.to(roomName).emit('is_not_editing', { // roomName - server will emit who is not editing signal to specific roomName
                roomDetail: roomDetail, // wait for front end implementation to decide what data is needed
                isEditing: getWhoIsEditing
            });
        } catch (error) {
            throw new WsException(error)
        }
    }

    /**
     * Signal 15.1.4: Update Note - Client side to emit signal to server side.
     *              : This should get emited when user clicks on ‘Edit Note’.
     *              : This event tells server that the note is being updated by someone and the notes would get updated onto DB.
     */
    @UseGuards(JwtAuthGuard)
    @SubscribeMessage('update_note')
    async update_note(@MessageBody("note_content") note_content: string, @MessageBody("id") roomId: any, @User() user: any, @ConnectedSocket() client: Socket) {
        let con: PoolConnection;
        try {
            
            let roomName = "ROOM " + roomId;
            let roomDetail = await this.gatewayService.retrieveSpecificRoomData(roomName);
            let getWhoIsEditing = await this.gatewayService.getWhoIsEditing(roomName);

            con = await this.qp.connectWithTbegin();
            await this.gatewayService.saveNoteIntoDatabase(roomId, note_content, user, con);
            let noteContent = await this.gatewayService.retrieveNoteDataFromDatabase(roomId, con);
            await this.qp.commitAndCloseConnection(con);

            this.server.to(roomName).emit('receive_note', { // roomName - server will emit signal to specific roomName
                roomDetail: roomDetail, // wait for front end implementation to decide what data is needed
                isEditing: getWhoIsEditing
            });
            this.server.to(roomName).emit('note_content', { // roomName - server will emit enter note success to specific roomName

                noteContent: noteContent, // wait for front end implementation to decide what data is needed
            });
        } catch (error) {
            if (con) await this.qp.rollbackAndCloseConnection(con);
            throw new WsException(error);
        }
    }
}
