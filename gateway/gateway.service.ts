import { Injectable, UseGuards } from '@nestjs/common';
import { PoolConnection } from 'mysql';
import { QpService } from 'src/common/qp/qp.service';
import * as moment from 'moment';
import { WsException } from '@nestjs/websockets';

@Injectable()
export class GatewayService {

    constructor(private readonly qp: QpService) { }

    roomClient = {}
    isEditingRoom = {}

    /**
     * Link a client to a room 
     **/
    async clientServerLink(roomName: any, clientId: any, user: any) {
        try {
            // If the room doesn't exist, create an empty array for it
            if (!this.roomClient[roomName]) {
                this.roomClient[roomName] = [];
            }

            // Check if the clientId already exists in the room's user list
            const clientIdExists = this.roomClient[roomName].some(existingUser =>
                existingUser.clientId === clientId
            );

            // const userKey = `user_${this.roomClient[roomName].length + 1}`;
            let shortName = await this.generateInitials(user.name);

            if (!clientIdExists) {
                const userObject = {
                    id: user.id,
                    clientId: clientId,
                    userCode: user.code,
                    userName: user.name,
                    iconName: shortName,
                    email: user.email,
                };

                this.roomClient[roomName].push(userObject);
            }
            return this.roomClient;
        } catch (error) {
            throw new WsException(error);
        }
    }

    getWhoIsEditing(roomName: any) {
        try {
            if (this.isEditingRoom.hasOwnProperty(roomName)) {
                const specificRoomData = this.isEditingRoom[roomName];
                return specificRoomData;
            }
        } catch (error) {
            throw new WsException(error)
        }
    }


    /**
     * Link a client to a room 
     **/
    async isEditing(roomName: any, clientId: any, user: any) {
        try {
            // If the room doesn't exist, create an empty array for it
            if (!this.isEditingRoom[roomName]) {
                this.isEditingRoom[roomName] = [];
            }

            // Check if the clientId already exists in the room's user list
            const clientIdExists = this.isEditingRoom[roomName].some(existingUser =>
                existingUser.clientId === clientId
            );

            let numberEditing = await this.getWhoIsEditing(roomName);

            // const userKey = `user_${this.roomClient[roomName].length + 1}`;
            let shortName = await this.generateInitials(user.name);
            if (numberEditing.length < 1) {
                if (!clientIdExists) {
                    const userObject = {
                        id: user.id,
                        clientId: clientId,
                        userCode: user.code,
                        userName: user.name,
                        iconName: shortName,
                        email: user.email,
                    };

                    this.isEditingRoom[roomName].push(userObject);
                }
            } 
            return this.isEditingRoom;
        } catch (error) {
            throw new WsException(error)
        }
    }

    /**
     * Remove a client from all rooms
     */
    async removeClientFromIsEditingRoom(clientId: any) {
        // Iterate through each room in the room-to-client mapping
        for (const roomName in this.isEditingRoom) {
            // Find the index of the clientId in the room's client list
            // Find the index of the existing client with the given clientId
            const existingClientIndex = this.isEditingRoom[roomName].findIndex(client => client.clientId === clientId);

            // If the clientId is found in the room's client list, remove it
            if (existingClientIndex !== -1) {
                this.isEditingRoom[roomName].splice(existingClientIndex, 1);

                // If the room's client list becomes empty, remove the room
                if (this.isEditingRoom[roomName].length === 0) {
                    delete this.isEditingRoom[roomName];
                }

                // Return the updated room-to-client mapping
                return this.isEditingRoom;
            }
        }

        // Return the room-to-client mapping if no changes were made
        return this.isEditingRoom;
    }

    /**
     * Remove a client from all rooms
     */
    async removeClientFromRoom(clientId: any) {
        // Iterate through each room in the room-to-client mapping
        for (const roomName in this.roomClient) {
            // Find the index of the clientId in the room's client list
            // Find the index of the existing client with the given clientId
            const existingClientIndex = this.roomClient[roomName].findIndex(client => client.clientId === clientId);

            // If the clientId is found in the room's client list, remove it
            if (existingClientIndex !== -1) {
                this.roomClient[roomName].splice(existingClientIndex, 1);

                // If the room's client list becomes empty, remove the room
                if (this.roomClient[roomName].length === 0) {
                    delete this.roomClient[roomName];
                }

                // Return the updated room-to-client mapping
                return this.roomClient;
            }
        }

        // Return the room-to-client mapping if no changes were made
        return this.roomClient;
    }

    retrieveSpecificRoomData(roomName: any) {
        try {
            if (this.roomClient.hasOwnProperty(roomName)) {
                const specificRoomData = this.roomClient[roomName];
                return specificRoomData;
            }
        } catch (error) {
            throw new WsException(error)
        }
    }

    async saveNoteIntoDatabase(roomId: any, note_content: any, user: any, con: PoolConnection) {
        // Prepare data object for updating the database
        const dao = {
            note: note_content,
            last_updated_time: moment().format(`YYYY-MM-DD HH:mm:ss`), // Get the current timestamp
            updated_by: user.code // Set the user who updated the note
        };

        // Perform the database update operation
        await this.qp.run('UPDATE wiki_note SET ? WHERE id = ?', [dao, roomId], con);
        // The above line updates the 'wiki_note' table with the new data ('dao') where the ID matches 'roomId'
    }

    getRoomNumberByClientId(clientId) {
        try {
            for (const roomName in this.roomClient) {
                const room = this.roomClient[roomName];
                const foundUser = room.find(user => user.clientId === clientId);
                if (foundUser) {
                    const roomNumber = parseInt(roomName.replace('ROOM ', ''));
                    return isNaN(roomNumber) ? null : roomNumber;
                }
            }
            return null; // Return null if clientId is not found in any room
        } catch (error) {
            throw new WsException(error);
        }
    }

    async generateInitials(name) {
        // Split the input name into words using space as the delimiter
        const words = name.split(' '); // split the name into words

        // Initialize an empty string to store the initials
        let initials = '';

        // Check if there is at least one word in the name
        if (words.length >= 1) {
            // Add the first letter of the first word as the first initial and convert it to uppercase
            initials += words[0][0].toUpperCase(); // First initial

            // Check if there are multiple words in the name
            if (words.length > 1) {
                // Add the first letter of the last word as the last initial and convert it to uppercase
                initials += words[words.length - 1][0].toUpperCase(); // Last initial
            }
        }

        // Return the generated initials
        return initials;
    }

    async retrieveNoteDataFromDatabase(id, con) {
        return await this.qp.selectFirst('SELECT note FROM wiki_note WHERE id = ?', [id], con);
    }
}